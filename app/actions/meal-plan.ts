'use server';

import { db } from '@/lib/db';
import { mealPlans } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type MealPlanFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
} | null;

// Types pour les repas
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
export type MealType = typeof MEAL_TYPES[number];

// Récupérer tous les repas planifiés pour une période
// Par défaut, récupère le mois en cours
export async function getMealPlans(startDate?: string, endDate?: string): Promise<{
  mealPlans: {
    id: string;
    date: string;
    mealType: string;
    recipeId: string | null;
    customNote: string | null;
    servings: number | null;
  }[];
}> {
  // Dates par défaut : mois en cours
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const start = startDate || defaultStart;
  const end = endDate || defaultEnd;

  const plans = await db
    .select({
      id: mealPlans.id,
      date: mealPlans.date,
      mealType: mealPlans.mealType,
      recipeId: mealPlans.recipeId,
      customNote: mealPlans.customNote,
      servings: mealPlans.servings,
    })
    .from(mealPlans)
    .where(
      and(
        gte(mealPlans.date, start),
        lte(mealPlans.date, end)
      )
    )
    .orderBy(asc(mealPlans.date), asc(mealPlans.mealType));

  return { mealPlans: plans as {
    id: string;
    date: string;
    mealType: MealType;
    recipeId: string | null;
    customNote: string | null;
    servings: number | null;
  }[] };
}

// Ajouter un repas au calendrier
export async function addMealPlan(
  prevState: MealPlanFormState,
  formData: FormData
): Promise<MealPlanFormState> {
  const date = formData.get('date') as string;
  const mealType = formData.get('mealType') as MealType;
  const recipeId = formData.get('recipeId') as string | null;
  const customNote = formData.get('customNote') as string | null;
  const servings = formData.get('servings') as string | null;

  // Validation
  if (!date) {
    return { errors: { date: ['La date est requise'] } };
  }

  if (!MEAL_TYPES.includes(mealType as MealType)) {
    return { errors: { mealType: ['Type de repas invalide'] } };
  }

  // Vérifier si un repas existe déjà pour ce créneau
  const existing = await db
    .select()
    .from(mealPlans)
    .where(
      and(
        eq(mealPlans.date, date),
        eq(mealPlans.mealType, mealType)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { errors: { form: ['Un repas est déjà planifié pour ce créneau'] } };
  }

  try {
    await db.insert(mealPlans).values({
      date,
      mealType,
      recipeId: recipeId || null,
      customNote: customNote || null,
      servings: servings ? parseInt(servings) : null,
    });

    revalidatePath('/');
    return { success: true, message: 'Repas ajouté au calendrier' };
  } catch (error) {
    console.error('Erreur lors de l\'ajout du repas:', error);
    return { errors: { form: ['Une erreur est survenue'] } };
  }
}

// Supprimer un repas du calendrier
export async function deleteMealPlan(
  prevState: MealPlanFormState,
  formData: FormData
): Promise<MealPlanFormState> {
  const id = formData.get('id') as string;

  if (!id) {
    return { errors: { id: ['ID requis'] } };
  }

  try {
    await db.delete(mealPlans).where(eq(mealPlans.id, id));

    revalidatePath('/');
    return { success: true, message: 'Repas supprimé du calendrier' };
  } catch (error) {
    console.error('Erreur lors de la suppression du repas:', error);
    return { errors: { form: ['Une erreur est survenue'] } };
  }
}

// Mettre à jour un repas existant
export async function updateMealPlan(
  prevState: MealPlanFormState,
  formData: FormData
): Promise<MealPlanFormState> {
  const id = formData.get('id') as string;
  const date = formData.get('date') as string;
  const mealType = formData.get('mealType') as MealType;
  const recipeId = formData.get('recipeId') as string | null;
  const customNote = formData.get('customNote') as string | null;
  const servings = formData.get('servings') as string | null;

  if (!id) {
    return { errors: { id: ['ID requis'] } };
  }

  if (!date) {
    return { errors: { date: ['La date est requise'] } };
  }

  if (!MEAL_TYPES.includes(mealType as MealType)) {
    return { errors: { mealType: ['Type de repas invalide'] } };
  }

  try {
    await db
      .update(mealPlans)
      .set({
        date,
        mealType,
        recipeId: recipeId || null,
        customNote: customNote || null,
        servings: servings ? parseInt(servings) : null,
      })
      .where(eq(mealPlans.id, id));

    revalidatePath('/');
    return { success: true, message: 'Repas mis à jour' };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du repas:', error);
    return { errors: { form: ['Une erreur est survenue'] } };
  }
}

// Récupérer les repas pour une date spécifique
export async function getMealPlansByDate(date: string): Promise<{
  mealPlans: {
    id: string;
    date: string;
    mealType: string;
    recipeId: string | null;
    customNote: string | null;
    servings: number | null;
  }[];
}> {
  const plans = await db
    .select({
      id: mealPlans.id,
      date: mealPlans.date,
      mealType: mealPlans.mealType,
      recipeId: mealPlans.recipeId,
      customNote: mealPlans.customNote,
      servings: mealPlans.servings,
    })
    .from(mealPlans)
    .where(eq(mealPlans.date, date))
    .orderBy(asc(mealPlans.mealType));

  return { mealPlans: plans as {
    id: string;
    date: string;
    mealType: MealType;
    recipeId: string | null;
    customNote: string | null;
    servings: number | null;
  }[] };
}
