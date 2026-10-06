'use server';

import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import { ingredientInput } from '@/lib/validators/ingredients';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type IngredientFormState = {
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
} | null;

export async function createIngredient(
  prevState: IngredientFormState,
  formData: FormData
): Promise<IngredientFormState> {
  const rawData = Object.fromEntries(formData);
  const parsed = ingredientInput.safeParse(rawData);
  if (!parsed.success) {
    return { 
      errors: parsed.error.flatten().fieldErrors,
      values: rawData
    };
  }

  try {
    await db.insert(ingredients).values(parsed.data);
  } catch {
    return { errors: { name: ['Cet ingrédient existe déjà'] } };
  }

  revalidatePath('/ingredients');
  redirect('/ingredients');
}

export async function updateIngredient(
  id: string,
  formData: FormData
): Promise<IngredientFormState> {
  const rawData = Object.fromEntries(formData);
  const parsed = ingredientInput.safeParse(rawData);
  if (!parsed.success) {
    return { 
      errors: parsed.error.flatten().fieldErrors,
      values: rawData
    };
  }

  try {
    await db.update(ingredients).set(parsed.data).where(eq(ingredients.id, id));
    revalidatePath('/ingredients');
    return null;
  } catch {
    return { errors: { name: ['Erreur lors de la mise à jour'] } };
  }
}

export async function deleteIngredient(id: string): Promise<{ error?: string }> {
  try {
    await db.delete(ingredients).where(eq(ingredients.id, id));
    revalidatePath('/ingredients');
    return {};
  } catch {
    return { error: 'Impossible de supprimer cet ingrédient (peut-être utilisé dans une recette)' };
  }
}
