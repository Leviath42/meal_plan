'use server';

import { db } from '@/lib/db';
import { requireHousehold } from '@/lib/auth-guards';
import { toLocalDateStr } from '@/lib/format';
import { mealPlans, recipes } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';
import { and, eq, gte, lte } from 'drizzle-orm';
import {
  mealPlanInput,
  type MealPlanFormState,
  type MealPlan,
  type MealPlanFormResult
} from '@/app/types/meal-plan';
import {
  bumpRecipeLastServedAt,
  getUserMinDaysBetween,
  findPlanInWindow,
  antidoublonMessage
} from '@/lib/meal-planning';

// F17 (C-062) : planning et recettes scopés par foyer — toute requête filtre
// par le foyer de session ; une recette d'un autre foyer ne peut jamais être
// planifiée (isolation, contrat 4b §1.3).

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

// Date du jour au format YYYY-MM-DD, fuseau local du serveur.
// Comparaison lexicographique fiable sur ce format ISO.
function todayLocalStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Héritage du type de plat (mealCourse) depuis la recette.
// Isolation (C-062) : la recette est cherchée DANS le foyer — introuvable
// ailleurs, la recette d'un autre foyer ne prête ni son type ni son titre.
async function getRecipeMealCourse(recipeId: string, householdId: string): Promise<string | null> {
  const [recipe] = await db
    .select({ mealCourse: recipes.mealCourse })
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.householdId, householdId)))
    .limit(1);
  return recipe?.mealCourse ?? null;
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
  const { session, householdId } = await requireHousehold();
  const userId = session.user?.id;

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
    if (!(key in raw)) delete (data as Record<string, unknown>)[key];
  }

  // Pas de replanification vers une date passée (le contrôle côté client
  // du modal ne suffit pas : l'attribut HTML min est contournable au clavier)
  if (data.date !== undefined && data.date < todayLocalStr()) {
    return {
      errors: { date: ['Impossible de replanifier un repas dans le passé'], general: ['Impossible de replanifier un repas dans le passé'] },
      values: rawData
    };
  }

  // Repas existant : uniquement dans le foyer de session (C-062)
  const [existing] = await db
    .select()
    .from(mealPlans)
    .where(and(eq(mealPlans.id, id), eq(mealPlans.householdId, householdId)))
    .limit(1);

  if (!existing) {
    return {
      errors: { general: ['Repas planifié introuvable'] },
      values: rawData
    };
  }

  // Isolation (C-062) : une recette fournie doit appartenir au foyer
  if ('recipeId' in data && data.recipeId) {
    const [ownedRecipe] = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.id, data.recipeId), eq(recipes.householdId, householdId)))
      .limit(1);
    if (!ownedRecipe) {
      return {
        errors: { recipeId: ['Recette introuvable'], general: ['Recette introuvable'] },
        values: rawData
      };
    }
  }

  // Si la recette change (et qu'aucun mealCourse explicite n'est fourni),
  // hériter le type de plat de la nouvelle recette — ou le vider sans recette
  if ('recipeId' in data && !('mealCourse' in data)) {
    data.mealCourse = data.recipeId ? await getRecipeMealCourse(data.recipeId, householdId) : null;
  }

  // Recette et date effectives après la mise à jour partielle
  const effectiveRecipeId = 'recipeId' in data ? data.recipeId : existing.recipeId;
  const effectiveDate = data.date !== undefined ? data.date : existing.date;

  // Antidoublon (F09) : refuser si la recette (nouvelle ou inchangée) est
  // déjà planifiée à moins de X jours de la date effective, hors ce plan.
  // F17 (C-062) : la fenêtre est celle du foyer, jamais de l'instance entière.
  if (
    userId &&
    ('recipeId' in data || data.date !== undefined) &&
    effectiveRecipeId &&
    effectiveDate
  ) {
    const minDays = await getUserMinDaysBetween(userId);
    if (minDays > 0) {
      const conflict = await findPlanInWindow({
        recipeId: effectiveRecipeId,
        date: effectiveDate,
        minDays,
        householdId,
        excludePlanId: id
      });
      if (conflict) {
        const message = antidoublonMessage(conflict.date, minDays);
        return {
          errors: { general: [message] },
          values: rawData
        };
      }
    }
  }

  try {
    // better-sqlite3 est synchrone : callback de transaction synchrone,
    // requêteurs .get()/.run() (un callback async est refusé par drizzle).
    // F08 - historique : mémoriser si le repas (recette + date) devient plus
    // récent ; aucun recalcul en cas de retrait de recette (historique).
    db.transaction((tx) => {
      tx
        .update(mealPlans)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(and(eq(mealPlans.id, id), eq(mealPlans.householdId, householdId)))
        .run();

      if (effectiveRecipeId && effectiveDate) {
        bumpRecipeLastServedAt(tx, effectiveRecipeId, effectiveDate, householdId);
      }
    });

    revalidatePath('/calendar');
    revalidatePath('/');
    return { errors: undefined, values: undefined };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du repas planifié:', error);
    return {
      errors: { general: ['Une erreur est survenue lors de la mise à jour'] },
      values: rawData
    };
  }
}

// Supprimer un repas planifié (uniquement dans le foyer de session)
export async function deleteMealPlan(id: string): Promise<{ error?: string }> {
  try {
    const { householdId } = await requireHousehold();
    // Historique maîtrisé : un repas dont la date est passée ne peut plus
    // être supprimé (l'historique F08 « dernier repas » doit rester fiable)
    const [plan] = await db
      .select({ date: mealPlans.date })
      .from(mealPlans)
      .where(and(eq(mealPlans.id, id), eq(mealPlans.householdId, householdId)))
      .limit(1);
    const today = toLocalDateStr(new Date());
    if (plan && plan.date < today) {
      return { error: "Impossible de supprimer un repas passé — l'historique est conservé" };
    }
    await db
      .delete(mealPlans)
      .where(and(eq(mealPlans.id, id), eq(mealPlans.householdId, householdId)));

    revalidatePath('/calendar');
    revalidatePath('/');
    return {};
  } catch (error) {
    console.error('Erreur lors de la suppression du repas planifié:', error);
    return { error: 'Impossible de supprimer ce repas planifié' };
  }
}

// Récupérer tous les repas planifiés du foyer pour une période [startDate, endDate]
export async function getMealPlans(
  startDate: string,
  endDate: string
): Promise<{ mealPlans: MealPlan[]; error?: string }> {
  // Les server actions sont des points d'entrée RPC invocables directement :
  // le middleware protège les pages, pas les actions — garde obligatoire.
  const { householdId } = await requireHousehold();
  try {
    const mealPlansList = await db
      .select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.householdId, householdId),
          gte(mealPlans.date, startDate),
          lte(mealPlans.date, endDate)
        )
      )
      .orderBy(mealPlans.date);

    return { mealPlans: mealPlansList as MealPlan[] };
  } catch (error) {
    console.error('Erreur lors de la récupération des repas planifiés:', error);
    return { mealPlans: [], error: 'Impossible de charger les repas planifiés' };
  }
}

// Ajouter un repas planifié (appelé depuis les modals du PlannerBoard)
export async function addMealPlan(
  prevState: any,
  formData: FormData
): Promise<MealPlanFormResult> {
  try {
    const { session, householdId } = await requireHousehold();
    const userId = session.user?.id;

    const rawData = formDataToRecord(formData);

    // Les champs nullable vides ('') doivent valoir null (ex. recipeId non-UUID)
    const raw: Record<string, string | null> = { ...rawData };
    for (const key of ['recipeId', 'customNote', 'mealCourse']) {
      if (raw[key] === '') raw[key] = null;
    }

    const parsed = mealPlanInput.safeParse(raw);

    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return {
        success: false,
        message: firstError || 'Données invalides',
        errors: parsed.error.flatten().fieldErrors
      };
    }

    const data = parsed.data;

    // Pas de planification dans le passé
    if (data.date < todayLocalStr()) {
      return {
        success: false,
        message: 'Impossible de planifier un repas dans le passé',
        errors: { date: ['Impossible de planifier un repas dans le passé'] }
      };
    }

    // Isolation (C-062) : une recette fournie doit appartenir au foyer
    if (data.recipeId) {
      const [ownedRecipe] = await db
        .select({ id: recipes.id })
        .from(recipes)
        .where(and(eq(recipes.id, data.recipeId), eq(recipes.householdId, householdId)))
        .limit(1);
      if (!ownedRecipe) {
        return {
          success: false,
          message: 'Recette introuvable',
          errors: { recipeId: ['Recette introuvable'] }
        };
      }
    }

    // Antidoublon (F09) : refuser une recette déjà planifiée à moins de X jours
    // de la nouvelle date (fenêtre [date - X, date + X], dates ISO).
    // F17 (C-062) : fenêtre du FOYER uniquement.
    if (data.recipeId && userId) {
      const minDays = await getUserMinDaysBetween(userId);
      if (minDays > 0) {
        const conflict = await findPlanInWindow({
          recipeId: data.recipeId,
          date: data.date,
          minDays,
          householdId
        });
        if (conflict) {
          const message = antidoublonMessage(conflict.date, minDays);
          return {
            success: false,
            message,
            errors: { recipeId: [message] }
          };
        }
      }
    }

    // Hériter le type de plat de la recette si non fourni
    if (data.recipeId && !data.mealCourse) {
      data.mealCourse = await getRecipeMealCourse(data.recipeId, householdId);
    }

    const now = new Date().toISOString();

    // better-sqlite3 est synchrone : callback de transaction synchrone,
    // requêteurs .get()/.run() (un callback async est refusé par drizzle)
    const mealPlan = db.transaction((tx) => {
      const inserted = tx
        .insert(mealPlans)
        .values({ ...data, householdId, createdAt: now, updatedAt: now })
        .returning()
        .get();

      // F08 - historique : date du repas le plus récent planifié avec cette recette
      if (data.recipeId) {
        bumpRecipeLastServedAt(tx, data.recipeId, data.date, householdId);
      }

      return inserted;
    });

    revalidatePath('/calendar');
    revalidatePath('/');

    return {
      success: true,
      message: 'Repas planifié ajouté avec succès',
      mealPlan: mealPlan as MealPlan
    };
  } catch (error: any) {
    console.error("Erreur lors de l'ajout du repas planifié:", error);
    return {
      success: false,
      message: "Une erreur est survenue lors de l'ajout",
      errors: { general: ['Une erreur est survenue'] }
    };
  }
}
