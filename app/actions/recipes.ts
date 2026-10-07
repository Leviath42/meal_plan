'use server';

import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-guards';
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
function formDataToRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      record[key] = value;
    }
  }
  return record;
}

export async function createRecipe(
  prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  await requireSession();
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

  const recipeId = await db.transaction(async (tx) => {
    const [recipe] = await tx
      .insert(recipes)
      .values(recipeData)
      .returning({ id: recipes.id });

    if (items.length > 0) {
      await tx.insert(recipeIngredients).values(
        items.map((it) => ({ ...it, recipeId: recipe.id }))
      );
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
  await requireSession();
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

  // Mise à jour transactionnelle : recette + ingrédients, ou rien
  await db.transaction(async (tx) => {
    await tx.update(recipes)
      .set({ ...recipeData, updatedAt: new Date().toISOString() })
      .where(eq(recipes.id, id));

    await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));

    if (items.length > 0) {
      await tx.insert(recipeIngredients).values(
        items.map((it) => ({ ...it, recipeId: id }))
      );
    }
  });

  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(id: string) {
  await requireSession();
  await db.delete(recipes).where(eq(recipes.id, id));
  revalidatePath('/recipes');
  redirect('/recipes');
}
