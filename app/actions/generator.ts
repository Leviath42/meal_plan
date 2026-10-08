'use server';

import { and, eq, gte, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-guards';
import { mealPlans, recipes } from '@/lib/db/schema';
import {
  addDaysToDateStr,
  bumpRecipeLastServedAt,
  getUserMinDaysBetween,
  parseLocalDateStr,
} from '@/lib/meal-planning';
import {
  GENERATOR_MEAL_TYPES,
  generatorInput,
  decideGeneratorSlots,
  type GeneratorParams,
  type GeneratorResult,
} from '@/lib/validators/generator';

// Date du jour au format YYYY-MM-DD, fuseau local du serveur
// (même logique que app/actions/meal-plan.ts)
function todayLocalStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Générer une planification de repas sur plusieurs jours, en respectant
// l'intervalle antidoublon de l'utilisateur (F09, fenêtre exclusive), les
// types de plats autorisés par type de repas et les tags exclus.
// Mode « combler » (défaut) : seuls les créneaux vides sont remplis.
// Mode « remplacer » : les repas existants des créneaux concernés — y compris
// les notes libres sans recette — sont supprimés avant génération.
export async function generateMealPlans(params: GeneratorParams): Promise<GeneratorResult> {
  try {
    const session = await requireSession();
    const userId = session.user?.id;

    const parsed = generatorInput.safeParse(params);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Paramètres invalides',
        created: 0,
        skipped: 0,
        noRecipe: 0,
      };
    }

    const data = parsed.data;

    // Pas de planification dans le passé (même règle que addMealPlan)
    if (data.startDate < todayLocalStr()) {
      return {
        success: false,
        message: 'Impossible de générer un menu à partir d\'une date passée',
        created: 0,
        skipped: 0,
        noRecipe: 0,
      };
    }

    // Créneaux à traiter : chaque jour de la plage (jours de semaine cochés,
    // ordre chronologique) croisé avec chaque type de repas coché (ordre
    // canonique du petit-déjeuner au dîner)
    const selectedMealTypes = new Set(data.mealTypes);
    const mealTypeOrder = GENERATOR_MEAL_TYPES.filter(type => selectedMealTypes.has(type));

    const slots: { date: string; mealType: string }[] = [];
    for (let offset = 0; offset < data.daysCount; offset++) {
      const date = addDaysToDateStr(data.startDate, offset);
      if (data.weekdays.includes(parseLocalDateStr(date).getDay())) {
        for (const mealType of mealTypeOrder) {
          slots.push({ date, mealType });
        }
      }
    }

    if (slots.length === 0) {
      return {
        success: true,
        message: 'Aucun créneau à planifier pour ces paramètres',
        created: 0,
        skipped: 0,
        noRecipe: 0,
      };
    }

    // Antidoublon (F09) : intervalle minimum de l'utilisateur connecté
    const minDays = userId ? await getUserMinDaysBetween(userId) : 0;

    const firstDate = data.startDate;
    const lastDate = addDaysToDateStr(data.startDate, data.daysCount - 1);

    // Repas existants sur la plage ÉTENDUE de minDays de chaque côté :
    // nécessaire au contrôle antidoublon (les créneaux eux-mêmes sont
    // couverts par cette plage, minDays >= 0)
    const existingPlans = await db
      .select({
        id: mealPlans.id,
        date: mealPlans.date,
        mealType: mealPlans.mealType,
        recipeId: mealPlans.recipeId,
      })
      .from(mealPlans)
      .where(
        and(
          gte(mealPlans.date, addDaysToDateStr(firstDate, -minDays)),
          lte(mealPlans.date, addDaysToDateStr(lastDate, minDays)),
        ),
      );

    // Catalogue complet : la sélection aléatoire et les filtres (mealCourse,
    // tags, fenêtre antidoublon qui évolue à chaque insertion) se font en
    // mémoire, créneau par créneau
    const allRecipes = await db
      .select({
        id: recipes.id,
        mealCourse: recipes.mealCourse,
        tags: recipes.tags,
      })
      .from(recipes);

    const outcomes = decideGeneratorSlots({
      slots,
      coursesByMealType: data.coursesByMealType,
      replaceExisting: data.replaceExisting,
      excludedTags: data.excludedTags,
      recipes: allRecipes,
      existingPlans,
      minDays,
    });

    let created = 0;
    let skipped = 0;
    let noRecipe = 0;

    // better-sqlite3 est synchrone : callback de transaction synchrone,
    // requêteurs .run() (un callback async est refusé par drizzle).
    // Tout le run est atomique — suppressions et insertions incluses.
    const now = new Date().toISOString();
    db.transaction((tx) => {
      for (const outcome of outcomes) {
        // Mode « remplacer » : supprimer les repas existants du créneau,
        // y compris les notes libres (recipe_id NULL)
        if (outcome.deleteExisting) {
          tx
            .delete(mealPlans)
            .where(
              and(
                eq(mealPlans.date, outcome.date),
                eq(mealPlans.mealType, outcome.mealType),
              ),
            )
            .run();
        }

        if (outcome.status === 'skipped') {
          skipped++;
          continue;
        }

        if (outcome.status === 'no-recipe') {
          noRecipe++;
          continue;
        }

        tx
          .insert(mealPlans)
          .values({
            date: outcome.date,
            mealType: outcome.mealType,
            recipeId: outcome.recipeId,
            servings: data.servings,
            // Type de plat hérité de la recette (même règle que addMealPlan)
            mealCourse: outcome.mealCourse ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        // F08 - historique : date du repas le plus récent planifié avec cette recette
        if (outcome.recipeId) {
          bumpRecipeLastServedAt(tx, outcome.recipeId, outcome.date);
        }

        created++;
      }
    });

    revalidatePath('/calendar');
    revalidatePath('/');

    const summary =
      `${created} repas ${created > 1 ? 'générés' : 'généré'}, ` +
      `${skipped} créneau${skipped > 1 ? 'x' : ''} ${skipped > 1 ? 'déjà pris' : 'déjà pris'}, ` +
      `${noRecipe} créneau${noRecipe > 1 ? 'x' : ''} sans recette compatible`;

    return { success: true, message: summary, created, skipped, noRecipe };
  } catch (error) {
    console.error('Erreur lors de la génération du menu:', error);
    const message = error instanceof Error && error.message
      ? error.message
      : 'Une erreur est survenue lors de la génération';
    return { success: false, message, created: 0, skipped: 0, noRecipe: 0 };
  }
}
