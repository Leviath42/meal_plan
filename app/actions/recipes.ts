'use server';

import { db } from '@/lib/db';
import { requireHousehold } from '@/lib/auth-guards';
import { ingredients, recipes, recipeIngredients } from '@/lib/db/schema';
import { recipeInput } from '@/lib/validators/recipes';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';

// F17 (C-062) : recettes et liaisons scopées par foyer — toute lecture/écriture
// filtre par le foyer de session (contrat 4b §1.1/§1.3). Les identifiants
// d'ingrédients fournis par le formulaire sont validés contre le catalogue
// DU FOYER : un identifiant d'un autre foyer ne peut pas être injecté.

export type RecipeFormState = {
  errors?: Record<string, string[]>;
  values?: Record<string, string | number>;
  ingredients?: any[];
} | null;

// Helper pour convertir FormData en Record<string, string | number>
function formDataToRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      record[key] = value;
    }
  }
  return record;
}

// Garde d'isolation : tous les ingrédients référencés doivent appartenir au
// catalogue du foyer (les server actions sont invocables directement, le
// formulaire ne suffit pas)
function ownedIngredientCount(householdId: string, ingredientIds: string[]): number {
  if (ingredientIds.length === 0) return 0;
  return db
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(and(eq(ingredients.householdId, householdId), inArray(ingredients.id, ingredientIds)))
    .all().length;
}

export async function createRecipe(
  prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const { session, householdId } = await requireHousehold();
  const rawData = formDataToRecord(formData);
  let ingredients: any;
  try {
    ingredients = JSON.parse(String(formData.get('ingredients') ?? '[]'));
  } catch {
    return {
      errors: { ingredients: ["Données d'ingrédients invalides"] },
      values: rawData
    };
  }
  const parsed = recipeInput.safeParse({
    ...rawData,
    ingredients: ingredients,
  });

  if (!parsed.success) {
    return { 
      errors: parsed.error.flatten().fieldErrors,
      values: rawData,
      ingredients: ingredients
    };
  }

  const { ingredients: items, ...recipeData } = parsed.data;
  // Créateur de la recette : email de l'utilisateur connecté
  recipeData.createdBy = session.user?.email ?? null;

  // Isolation (C-062) : les identifiants d'ingrédients doivent être ceux du
  // catalogue du foyer — un autre foyer ne prête jamais ses ingrédients
  const ingredientIds = items.map((it) => it.ingredientId);
  if (new Set(ingredientIds).size !== ownedIngredientCount(householdId, ingredientIds)) {
    return {
      errors: { ingredients: ['Ingrédient introuvable dans votre catalogue'] },
      values: rawData,
      ingredients: ingredients
    };
  }

  // better-sqlite3 est synchrone : callback de transaction synchrone,
  // requeteurs .get()/.run() (un callback async est refuse par drizzle)
  const recipeId = db.transaction((tx) => {
    const recipe = tx
      .insert(recipes)
      .values({ ...recipeData, householdId })
      .returning({ id: recipes.id })
      .get();

    if (items.length > 0) {
      tx.insert(recipeIngredients).values(
        items.map((it) => ({ ...it, recipeId: recipe.id, householdId }))
      ).run();
    }
    return recipe.id;
  });

  revalidatePath('/recipes');
  redirect(`/recipes/${recipeId}`);
}

export async function updateRecipe(
  prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const { householdId } = await requireHousehold();
  const id = String(formData.get('id'));
  const rawData = formDataToRecord(formData);
  let ingredients: any;
  try {
    ingredients = JSON.parse(String(formData.get('ingredients') ?? '[]'));
  } catch {
    return {
      errors: { ingredients: ["Données d'ingrédients invalides"] },
      values: rawData
    };
  }
  
  const parsed = recipeInput.safeParse({
    ...rawData,
    ingredients: ingredients,
  });

  if (!parsed.success) {
    return { 
      errors: parsed.error.flatten().fieldErrors,
      values: rawData,
      ingredients: ingredients
    };
  }

  const { ingredients: items, ...recipeData } = parsed.data;

  // Isolation (C-062) : la recette modifiée doit appartenir au foyer, et les
  // identifiants d'ingrédients être ceux du catalogue du foyer
  const [owned] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.householdId, householdId)))
    .limit(1);
  if (!owned) {
    return { errors: { general: ['Recette introuvable'] }, values: rawData };
  }
  const ingredientIds = items.map((it) => it.ingredientId);
  if (new Set(ingredientIds).size !== ownedIngredientCount(householdId, ingredientIds)) {
    return {
      errors: { ingredients: ['Ingrédient introuvable dans votre catalogue'] },
      values: rawData,
      ingredients: ingredients
    };
  }

  // Mise à jour transactionnelle : recette + ingrédients, ou rien
  db.transaction((tx) => {
    tx.update(recipes)
      .set({ ...recipeData, updatedAt: new Date().toISOString() })
      .where(and(eq(recipes.id, id), eq(recipes.householdId, householdId)))
      .run();

    tx.delete(recipeIngredients)
      .where(and(eq(recipeIngredients.recipeId, id), eq(recipeIngredients.householdId, householdId)))
      .run();

    if (items.length > 0) {
      tx.insert(recipeIngredients).values(
        items.map((it) => ({ ...it, recipeId: id, householdId }))
      ).run();
    }
  });

  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
  revalidatePath('/');
  revalidatePath('/calendar');
  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(id: string) {
  const { householdId } = await requireHousehold();
  // Isolation (C-062) : suppression bornée au foyer de session
  await db
    .delete(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.householdId, householdId)));
  revalidatePath('/recipes');
  revalidatePath('/');
  revalidatePath('/calendar');
  redirect('/recipes');
}
