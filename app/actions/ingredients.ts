'use server';

import { db } from '@/lib/db';
import { requireHousehold } from '@/lib/auth-guards';
import { multiHouseholdsEnabled } from '@/lib/household';
import { seedIngredientLibraryForHousehold } from '../../scripts/seed-ingredients';
import { ingredients } from '@/lib/db/schema';
import { ingredientInput } from '@/lib/validators/ingredients';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// F17 (C-062) : catalogue isolé par foyer (contrat 4b §1.1) — l'UNIQUE de nom
// d'ingrédient est porté par (household_id, name) en base ; toute requête
// filtre par le foyer de session.

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
  const { householdId } = await requireHousehold();
  const rawData = formDataToRecord(formData);
  const parsed = ingredientInput.safeParse(rawData);
  if (!parsed.success) {
    return { 
      errors: parsed.error.flatten().fieldErrors,
      values: rawData
    };
  }

  try {
    await db.insert(ingredients).values({ ...parsed.data, householdId });
  } catch {
    // UNIQUE (household_id, name) : le nom existe déjà DANS CE FOYER
    return { errors: { name: ['Cet ingrédient existe déjà'] } };
  }

  revalidatePath('/ingredients');
  redirect('/ingredients');
}

export async function updateIngredient(
  id: string,
  formData: FormData
): Promise<IngredientFormState> {
  const { householdId } = await requireHousehold();
  const rawData = formDataToRecord(formData);
  const parsed = ingredientInput.safeParse(rawData);
  if (!parsed.success) {
    return { 
      errors: parsed.error.flatten().fieldErrors,
      values: rawData
    };
  }

  try {
    await db
      .update(ingredients)
      .set(parsed.data)
      .where(and(eq(ingredients.id, id), eq(ingredients.householdId, householdId)));
    revalidatePath('/ingredients');
    return null;
  } catch {
    return { errors: { name: ['Erreur lors de la mise à jour'] } };
  }
}

export async function deleteIngredient(id: string): Promise<{ error?: string }> {
  try {
    const { householdId } = await requireHousehold();
    await db
      .delete(ingredients)
      .where(and(eq(ingredients.id, id), eq(ingredients.householdId, householdId)));
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
  const { householdId } = await requireHousehold();
  const parsed = ingredientInput.safeParse({ name, category, defaultUnit });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Valeur invalide' };
  }

  try {
    const [created] = await db
      .insert(ingredients)
      .values({ ...parsed.data, householdId })
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
    // UNIQUE (household_id, name) : déjà présent dans CE foyer
    return { success: false, message: 'Cet ingrédient existe déjà' };
  }
}

// F17 (C-062, MULTI_HOUSEHOLDS=ON, contrat 4b §1.4) : remplir le catalogue du
// foyer de session avec la bibliothèque de référence (~250 ingrédients), via
// scripts/seed-ingredients.ts en mode ciblé par foyer. Anti-doublon sur
// (household_id, name) : idempotent, répétée la commande n'ajoute rien.
export async function seedHouseholdCatalog(): Promise<void> {
  const { householdId } = await requireHousehold();
  if (!multiHouseholdsEnabled()) {
    // Bouton affiché uniquement en mode multi-foyers : sans MULTI_HOUSEHOLDS
    // le foyer principal partage déjà le catalogue de l'instance.
    return;
  }
  seedIngredientLibraryForHousehold(householdId);
  revalidatePath('/welcome');
  revalidatePath('/ingredients');
}
