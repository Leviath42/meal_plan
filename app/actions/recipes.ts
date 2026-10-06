'use server';

import { db } from '@/lib/db';
import { recipes, recipeIngredients } from '@/lib/db/schema';
import { recipeInput } from '@/lib/validators/recipes';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

export type RecipeFormState = {
  errors?: Record<string, string[]>;
  values?: Record<string, string | number>;
  ingredients?: any[];
} | null;

// Helper pour convertir FormData en Record<string, string | number>
function formDataToRecord(formData: FormData): Record<string, string | number> {
  const record: Record<string, string | number> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      // Essayer de parser en number si possible
      if (!isNaN(Number(value))) {
        record[key] = Number(value);
      } else {
        record[key] = value;
      }
    }
  }
  return record;
}

export async function createRecipe(
  prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const rawData = formDataToRecord(formData);
  const ingredients = JSON.parse(String(formData.get('ingredients') ?? '[]'));
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

  const [recipe] = await db
    .insert(recipes)
    .values(recipeData)
    .returning({ id: recipes.id });

  // Only insert ingredients if there are any
  if (items.length > 0) {
    await db.insert(recipeIngredients).values(
      items.map((it) => ({ ...it, recipeId: recipe.id }))
    );
  }

  revalidatePath('/recipes');
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(
  prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const id = String(formData.get('id'));
  const rawData = formDataToRecord(formData);
  const ingredients = JSON.parse(String(formData.get('ingredients') ?? '[]'));
  
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

  // Mettre à jour la recette
  await db.update(recipes)
    .set({ ...recipeData, updatedAt: new Date().toISOString() })
    .where(eq(recipes.id, id));

  // Supprimer les anciens ingrédients et en ajouter les nouveaux
  await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
  
  if (items.length > 0) {
    await db.insert(recipeIngredients).values(
      items.map((it) => ({ ...it, recipeId: id }))
    );
  }

  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(id: string) {
  await db.delete(recipes).where(eq(recipes.id, id));
  revalidatePath('/recipes');
  redirect('/recipes');
}
