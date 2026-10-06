'use server';

import { db } from '@/lib/db';
import { mealPlans } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import {
  mealPlanInput,
  type MealPlanFormState,
  type MealPlan,
  type MealPlanFormResult
} from '@/app/types/meal-plan';

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

// Créer un nouveau repas planifié
export async function createMealPlan(
  prevState: MealPlanFormState,
  formData: FormData
): Promise<MealPlanFormState> {
  const rawData = formDataToRecord(formData);
  
  const parsed = mealPlanInput.safeParse(rawData);
  
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      values: rawData
    };
  }

  const data = parsed.data;

  try {
    const now = new Date().toISOString();
    const [mealPlan] = await db
      .insert(mealPlans)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning();

    revalidatePath('/calendar');
    return { errors: undefined, values: undefined };
  } catch (error) {
    console.error('Erreur lors de la création du repas planifié:', error);
    return {
      errors: { general: ['Une erreur est survenue lors de la création'] },
      values: rawData
    };
  }
}

// Mettre à jour un repas planifié
// Accepte les mises à jour partielles : seuls les champs présents dans le
// FormData sont modifiés. Une chaîne vide sur un champ nullable (recipeId,
// customNote, mealCourse) vide le champ.
export async function updateMealPlan(
  id: string,
  prevState: MealPlanFormState,
  formData: FormData
): Promise<MealPlanFormState> {
  const rawData = formDataToRecord(formData);

  const raw: Record<string, string | null> = { ...rawData };
  for (const key of ['recipeId', 'customNote', 'mealCourse']) {
    if (raw[key] === '') raw[key] = null;
  }

  const parsed = mealPlanInput.partial().safeParse(raw);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      values: rawData
    };
  }

  const data = parsed.data;

  // Ne conserver que les champs réellement présents dans le FormData
  // (évite qu'un default Zod, ex. servings=4, écrase une valeur existante)
  for (const key of Object.keys(data)) {
    if (!(key in raw)) delete data[key];
  }

  try {
    await db
      .update(mealPlans)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(mealPlans.id, id));

    revalidatePath('/calendar');
    return { errors: undefined, values: undefined };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du repas planifié:', error);
    return {
      errors: { general: ['Une erreur est survenue lors de la mise à jour'] },
      values: rawData
    };
  }
}

// Supprimer un repas planifié
export async function deleteMealPlan(id: string): Promise<{ error?: string }> {
  try {
    await db
      .delete(mealPlans)
      .where(eq(mealPlans.id, id));

    revalidatePath('/calendar');
    return {};
  } catch (error) {
    console.error('Erreur lors de la suppression du repas planifié:', error);
    return { error: 'Impossible de supprimer ce repas planifié' };
  }
}

// Replanifier un repas (déplacer via drag & drop)
// Plusieurs repas peuvent coexister sur un même créneau (date + type de repas)
export async function replanMealPlan(
  mealPlanId: string,
  newDate: string,
  newMealType: string
): Promise<{ error?: string }> {
  try {
    await db
      .update(mealPlans)
      .set({
        date: newDate,
        mealType: newMealType,
        updatedAt: new Date().toISOString()
      })
      .where(eq(mealPlans.id, mealPlanId));

    revalidatePath('/calendar');
    return {};
  } catch (error) {
    console.error('Erreur lors de la replanification:', error);
    return { error: 'Impossible de replanifier ce repas' };
  }
}

// Récupérer tous les repas planifiés pour une période
export async function getMealPlansByDateRange(
  startDate: string,
  endDate: string
): Promise<MealPlan[]> {
  try {
    const mealPlansList = await db
      .select()
      .from(mealPlans)
      .where(
        or(
          eq(mealPlans.date, startDate),
          and(
            gte(mealPlans.date, startDate),
            lte(mealPlans.date, endDate)
          )
        )
      )
      .orderBy(mealPlans.date);

    return mealPlansList as MealPlan[];
  } catch (error) {
    console.error('Erreur lors de la récupération des repas planifiés:', error);
    return [];
  }
}

// Récupérer tous les repas planifiés pour une période (version compatible avec le composant existant)
export async function getMealPlans(
  startDate: string,
  endDate: string
): Promise<{ mealPlans: MealPlan[] }> {
  try {
    const mealPlansList = await db
      .select()
      .from(mealPlans)
      .where(
        or(
          eq(mealPlans.date, startDate),
          and(
            gte(mealPlans.date, startDate),
            lte(mealPlans.date, endDate)
          )
        )
      )
      .orderBy(mealPlans.date);

    return { mealPlans: mealPlansList as MealPlan[] };
  } catch (error) {
    console.error('Erreur lors de la récupération des repas planifiés:', error);
    return { mealPlans: [] };
  }
}

// Récupérer tous les repas planifiés
export async function getAllMealPlans(): Promise<MealPlan[]> {
  try {
    const mealPlansList = await db
      .select()
      .from(mealPlans)
      .orderBy(mealPlans.date);

    return mealPlansList as MealPlan[];
  } catch (error) {
    console.error('Erreur lors de la récupération de tous les repas planifiés:', error);
    return [];
  }
}

// Récupérer un repas planifié par ID
export async function getMealPlanById(id: string): Promise<MealPlan | null> {
  try {
    const [mealPlan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.id, id))
      .limit(1);

    return mealPlan as MealPlan | null;
  } catch (error) {
    console.error('Erreur lors de la récupération du repas planifié:', error);
    return null;
  }
}

// Fonction compatible avec le composant existant (addMealPlan)
export async function addMealPlan(
  prevState: any,
  formData: FormData
): Promise<MealPlanFormResult> {
  try {
    const rawData = formDataToRecord(formData);
    
    // Validation basique
    if (!rawData.date || !rawData.mealType) {
      return {
        success: false,
        message: 'La date et le type de repas sont requis',
        errors: {
          date: !rawData.date ? ['La date est requise'] : [],
          mealType: !rawData.mealType ? ['Le type de repas est requis'] : []
        }
      };
    }

    const now = new Date().toISOString();
    const mealPlanData = {
      date: rawData.date as string,
      mealType: rawData.mealType as string,
      recipeId: rawData.recipeId as string | null || null,
      customNote: rawData.customNote as string | null || null,
      servings: rawData.servings ? parseInt(rawData.servings as string) || 4 : 4,
      mealCourse: rawData.mealCourse as string | null || null,
      createdAt: now,
      updatedAt: now,
    };

    const [mealPlan] = await db
      .insert(mealPlans)
      .values(mealPlanData)
      .returning();

    revalidatePath('/calendar');
    
    return {
      success: true,
      message: 'Repas planifié ajouté avec succès',
      mealPlan: mealPlan as MealPlan
    };
  } catch (error: any) {
    console.error('Erreur lors de l\'ajout du repas planifié:', error);
    return {
      success: false,
      message: 'Une erreur est survenue lors de l\'ajout',
      errors: { general: ['Une erreur est survenue'] }
    };
  }
}

// Fonction compatible avec le composant existant (deleteMealPlan avec formData)
export async function deleteMealPlanFromForm(
  prevState: any,
  formData: FormData
): Promise<MealPlanFormResult> {
  try {
    const id = formData.get('id') as string;
    
    if (!id) {
      return {
        success: false,
        message: 'ID manquant',
        errors: { id: ['L\'ID est requis'] }
      };
    }

    await db
      .delete(mealPlans)
      .where(eq(mealPlans.id, id));

    revalidatePath('/calendar');
    
    return {
      success: true,
      message: 'Repas planifié supprimé avec succès'
    };
  } catch (error) {
    console.error('Erreur lors de la suppression du repas planifié:', error);
    return {
      success: false,
      message: 'Impossible de supprimer ce repas planifié',
      errors: { general: ['Impossible de supprimer ce repas planifié'] }
    };
  }
}
