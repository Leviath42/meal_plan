'use server';

import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-guards';
import { ingredients, mealPlans, recipeIngredients, recipes, shoppingItems } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';
import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import { manualShoppingItemInput, shoppingPeriodInput, type ShoppingFormState } from '@/lib/validators/shopping';

// Helper pour convertir FormData en Record<string, string>
function formDataToRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      record[key] = value;
    }
  }
  return record;
}

// Date locale au format YYYY-MM-DD (comparaison lexicographique fiable)
function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Dernier jour de la période : aujourd'hui + (days - 1)
function periodEndDateStr(days: number): string {
  const end = new Date();
  end.setDate(end.getDate() + days - 1);
  return toLocalDateStr(end);
}

// Arrondi à 3 décimales pour éviter les résidus flottants (0.1 + 0.2)
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// Générer la liste de courses depuis les repas planifiés de la période.
// - mise à l'échelle : quantité × (plan.servings / recipe.defaultServings),
//   facteur 1 si defaultServings est absent/nul ou si les couverts coincident ;
// - fusion par (ingrédient, unité) en sommant les quantités ;
// - remplace les lignes générées (addedManually = false) sans toucher
//   aux lignes ajoutées manuellement.
export async function generateShoppingList(
  prevState: ShoppingFormState,
  formData: FormData
): Promise<ShoppingFormState> {
  const rawData = formDataToRecord(formData);

  try {
    await requireSession();

    const parsed = shoppingPeriodInput.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Période invalide',
        errors: parsed.error.flatten().fieldErrors,
        values: rawData,
      };
    }

    const days = parsed.data.days;
    const startDate = toLocalDateStr(new Date());
    const endDate = periodEndDateStr(days);

    // Repas planifiés avec recette sur la période (les notes seules sont ignorées)
    const plans = await db
      .select({
        recipeId: mealPlans.recipeId,
        servings: mealPlans.servings,
      })
      .from(mealPlans)
      .where(
        and(
          gte(mealPlans.date, startDate),
          lte(mealPlans.date, endDate),
          isNotNull(mealPlans.recipeId)
        )
      );

    const recipeIds = [...new Set(plans.map((plan) => plan.recipeId as string))];

    // Ingrédients de recette par recette, avec le nom et le rayon
    const recipeIngredientRows = recipeIds.length
      ? await db
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
      : [];

    // Couverts de référence de chaque recette (base de la mise à l'échelle)
    const recipeRows = recipeIds.length
      ? await db
          .select({ id: recipes.id, defaultServings: recipes.defaultServings })
          .from(recipes)
          .where(inArray(recipes.id, recipeIds))
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

    const rowsToInsert = [...merged.values()].map((item) => ({
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      isBought: false,
      addedManually: false,
    }));

    // Remplacement atomique des lignes générées (les manuelles sont préservées)
    db.transaction((tx) => {
      tx.delete(shoppingItems).where(eq(shoppingItems.addedManually, false)).run();
      if (rowsToInsert.length > 0) {
        tx.insert(shoppingItems).values(rowsToInsert).run();
      }
    });

    revalidatePath('/shopping-list');

    if (plans.length === 0) {
      return {
        success: true,
        message: 'Aucun repas planifié avec recette sur cette période — liste générée vidée',
      };
    }

    return {
      success: true,
      message: `Liste générée : ${rowsToInsert.length} article${rowsToInsert.length > 1 ? 's' : ''} sur ${days} jours`,
    };
  } catch (error) {
    console.error('Erreur lors de la génération de la liste de courses:', error);
    return {
      success: false,
      message: 'Une erreur est survenue lors de la génération de la liste',
      values: rawData,
    };
  }
}

// Ajouter un article saisi à la main (addedManually = true)
export async function addManualShoppingItem(
  prevState: ShoppingFormState,
  formData: FormData
): Promise<ShoppingFormState> {
  const rawData = formDataToRecord(formData);

  try {
    await requireSession();

    const parsed = manualShoppingItemInput.safeParse(rawData);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return {
        success: false,
        message: firstError || 'Données invalides',
        errors: parsed.error.flatten().fieldErrors,
        values: rawData,
      };
    }

    await db.insert(shoppingItems).values({
      manualName: parsed.data.name,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      isBought: false,
      addedManually: true,
    });

    revalidatePath('/shopping-list');
    return { success: true, message: 'Article ajouté à la liste' };
  } catch (error) {
    console.error("Erreur lors de l'ajout manuel d'un article:", error);
    return {
      success: false,
      message: "Une erreur est survenue lors de l'ajout de l'article",
      values: rawData,
    };
  }
}

// Cocher / décocher un article (généré ou manuel)
export async function toggleShoppingItem(
  id: string,
  isBought: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    await requireSession();

    await db.update(shoppingItems).set({ isBought }).where(eq(shoppingItems.id, id));

    revalidatePath('/shopping-list');
    return { success: true, message: '' };
  } catch (error) {
    console.error("Erreur lors du changement d'état d'un article:", error);
    return { success: false, message: "Impossible de mettre à jour l'article" };
  }
}

// Supprimer un article de la liste (généré ou manuel)
export async function deleteShoppingItem(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireSession();

    await db.delete(shoppingItems).where(eq(shoppingItems.id, id));

    revalidatePath('/shopping-list');
    return { success: true, message: '' };
  } catch (error) {
    console.error("Erreur lors de la suppression d'un article:", error);
    return { success: false, message: 'Impossible de supprimer cet article' };
  }
}
