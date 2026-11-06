// app/shopping-list/queries.ts
// Cœur de la génération de la liste de courses (F11 + refonte C-057) :
// requêtes + fusion + déduction du garde-manger + remplacement atomique.
// Module partagé entre la Server Action (app/actions/shopping.ts) et le test
// runtime (scripts/test-pantry.ts) — le test exécute le code de production,
// pas une réplique (leçons C-047 et C-055). PAS un fichier « use server » :
// la garde de session reste dans l'action. Transactions better-sqlite3
// synchrones uniquement.

import { db } from '@/lib/db';
import { ingredients, mealPlans, recipeIngredients, recipes, shoppingItems } from '@/lib/db/schema';
import { and, eq, gte, isNotNull, lte, inArray } from 'drizzle-orm';
import { deductPantryStock, fetchPantryStock } from '@/app/pantry/queries';

// Arrondi à 3 décimales pour éviter les résidus flottants (0.1 + 0.2)
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export interface GenerationResult {
  // Articles effectivement demandés (après déduction du garde-manger)
  rowCount: number;
  // Repas planifiés avec recette sur la période
  plannedMeals: number;
  // Articles dont la quantité a été réduite par le stock en réserve
  deducted: number;
  // Articles entièrement couverts par le stock (absents de la liste)
  excluded: number;
}

// Génère la liste depuis les repas planifiés de la période (dates ISO
// YYYY-MM-DD, début et fin inclus) :
// - mise à l'échelle : quantité × (plan.servings / recipe.defaultServings),
//   facteur 1 si defaultServings est absent/nul ou si les couverts coïncident ;
// - fusion par (ingrédient, unité) en sommant les quantités ;
// - garde-manger : le stock couvre une partie du besoin — 500 g dont 200 g
//   en rayon → 300 g demandés ; besoin entièrement couvert → article exclu ;
//   la correspondance se fait par (ingrédient, unité) à l'identique ;
// - remplace les lignes générées (addedManually = false) sans toucher aux
//   lignes ajoutées manuellement, en conservant les coches d'achat.
export function generateShoppingRows(startDate: string, endDate: string): GenerationResult {
  // Repas planifiés avec recette sur la période (les notes seules sont ignorées)
  const plans = db
    .select({ recipeId: mealPlans.recipeId, servings: mealPlans.servings })
    .from(mealPlans)
    .where(and(gte(mealPlans.date, startDate), lte(mealPlans.date, endDate), isNotNull(mealPlans.recipeId)))
    .all();

  const recipeIds = [...new Set(plans.map((plan) => plan.recipeId as string))];

  // Ingrédients de recette par recette, avec le nom et le rayon
  const recipeIngredientRows = recipeIds.length
    ? db
        .select({
          recipeId: recipeIngredients.recipeId,
          ingredientId: recipeIngredients.ingredientId,
          ingredientName: ingredients.name,
          category: ingredients.category,
          quantity: recipeIngredients.quantity,
          unit: recipeIngredients.unit,
        })
        .from(recipeIngredients)
        .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
        .where(inArray(recipeIngredients.recipeId, recipeIds))
        .all()
    : [];

  // Couverts de référence de chaque recette (base de la mise à l'échelle)
  const recipeRows = recipeIds.length
    ? db.select({ id: recipes.id, defaultServings: recipes.defaultServings }).from(recipes).where(inArray(recipes.id, recipeIds)).all()
    : [];
  const defaultServingsById = new Map(recipeRows.map((row) => [row.id, row.defaultServings]));

  // Ingrédients groupés par recette pour le parcours des plans
  const ingredientsByRecipe = new Map<string, typeof recipeIngredientRows>();
  for (const row of recipeIngredientRows) {
    const list = ingredientsByRecipe.get(row.recipeId) ?? [];
    list.push(row);
    ingredientsByRecipe.set(row.recipeId, list);
  }

  // Mise à l'échelle + fusion par (ingrédient, unité)
  const merged = new Map<string, { ingredientId: string; unit: string; quantity: number }>();
  for (const plan of plans) {
    const base = defaultServingsById.get(plan.recipeId as string);
    const servings = plan.servings ?? base ?? 0;
    // Facteur 1 si la recette n'a pas de couverts de référence (nul),
    // ou si les couverts du plan correspondent à la référence
    const factor = base && base > 0 && servings !== base ? servings / base : 1;

    for (const row of ingredientsByRecipe.get(plan.recipeId as string) ?? []) {
      const key = `${row.ingredientId}|${row.unit}`;
      const existing = merged.get(key);
      const scaled = row.quantity * factor;
      if (existing) {
        existing.quantity = round3(existing.quantity + scaled);
      } else {
        merged.set(key, {
          ingredientId: row.ingredientId,
          unit: row.unit,
          quantity: round3(scaled),
        });
      }
    }
  }

  // Garde-manger : déduction du stock (lecture récente en base, aucun cache)
  const { rows: afterStock, deducted, excluded } = deductPantryStock([...merged.values()], fetchPantryStock());
  const rowsToInsert = afterStock.map((item) => ({
    ingredientId: item.ingredientId,
    quantity: item.quantity,
    unit: item.unit,
    isBought: false,
    addedManually: false,
  }));

  // Remplacement atomique des lignes générées (les manuelles sont
  // préservées), en conservant les coches des articles déjà achetés :
  // régénérer en plein supermarché ne doit pas effacer le progrès d'achat.
  db.transaction((tx) => {
    const bought = tx
      .select({ ingredientId: shoppingItems.ingredientId, unit: shoppingItems.unit })
      .from(shoppingItems)
      .where(and(eq(shoppingItems.addedManually, false), eq(shoppingItems.isBought, true)))
      .all() as Array<{ ingredientId: string | null; unit: string }>;
    const boughtKeys = new Set(bought.map((item) => `${item.ingredientId}|${item.unit}`));

    tx.delete(shoppingItems).where(eq(shoppingItems.addedManually, false)).run();
    if (rowsToInsert.length > 0) {
      tx.insert(shoppingItems)
        .values(
          rowsToInsert.map((row) => ({
            ...row,
            isBought: boughtKeys.has(`${row.ingredientId}|${row.unit}`),
          }))
        )
        .run();
    }
  });

  return { rowCount: rowsToInsert.length, plannedMeals: plans.length, deducted, excluded };
}
