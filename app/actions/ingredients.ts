'use server';

import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-guards';
import { ingredients } from '@/lib/db/schema';
import { ingredientInput } from '@/lib/validators/ingredients';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type IngredientFormState = {
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
} | null;

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

export async function createIngredient(
  prevState: IngredientFormState,
  formData: FormData
): Promise<IngredientFormState> {
  await requireSession();
  const rawData = formDataToRecord(formData);
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
  await requireSession();
  const rawData = formDataToRecord(formData);
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
    await requireSession();
    await db.delete(ingredients).where(eq(ingredients.id, id));
    revalidatePath('/ingredients');
    return {};
  } catch {
    return { error: 'Impossible de supprimer cet ingrédient (peut-être utilisé dans une recette)' };
  }
}

// Création rapide d'un ingrédient depuis le formulaire de recette : pas de
// redirection, on renvoie l'ingrédient créé pour l'ajouter à la sélection.
export interface QuickIngredientResult {
  success: boolean;
  message?: string;
  ingredient?: { id: string; name: string; category: string; defaultUnit: string };
}

export async function quickCreateIngredient(
  name: string,
  category: string,
  defaultUnit: string
): Promise<QuickIngredientResult> {
  await requireSession();
  const parsed = ingredientInput.safeParse({ name, category, defaultUnit });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Valeur invalide' };
  }

  try {
    const [created] = await db
      .insert(ingredients)
      .values(parsed.data)
      .returning({
        id: ingredients.id,
        name: ingredients.name,
        category: ingredients.category,
        defaultUnit: ingredients.defaultUnit,
      });
    revalidatePath('/ingredients');
    revalidatePath('/recipes/new');
    return { success: true, ingredient: created };
  } catch {
    return { success: false, message: 'Cet ingrédient existe déjà' };
  }
}
