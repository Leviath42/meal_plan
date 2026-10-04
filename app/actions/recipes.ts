'use server';

import { db } from '@/lib/db';
import { recipes, recipeIngredients } from '@/lib/db/schema';
import { recipeInput } from '@/lib/validators/recipes';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type RecipeFormState = {
  errors?: Record<string, string[]>;
} | null;

export async function createRecipe(
  prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const parsed = recipeInput.safeParse({
    ...Object.fromEntries(formData),
    ingredients: JSON.parse(String(formData.get('ingredients') ?? '[]')),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { ingredients: items, ...recipeData } = parsed.data;

  const [recipe] = await db
    .insert(recipes)
    .values(recipeData)
    .returning({ id: recipes.id });

  await db.insert(recipeIngredients).values(
    items.map((it) => ({ ...it, recipeId: recipe.id }))
  );

  revalidatePath('/recipes');
  redirect(`/recipes/${recipe.id}`);
}

export async function deleteRecipe(id: string) {
  await db.delete(recipes).where(eq(recipes.id, id));
  revalidatePath('/recipes');
  redirect('/recipes');
}