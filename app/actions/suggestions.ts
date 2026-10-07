'use server';

import { z } from 'zod';
import { requireSession } from '@/lib/auth-guards';
import { findSuggestableRecipes, getUserMinDaysBetween } from '@/lib/meal-planning';
import type { SuggestedRecipe } from '@/app/types/meal-plan';

// Résultat de suggestRecipes : recipes vide = aucune recette disponible
// hors fenêtre antidoublon (l'affichage reste à la charge du client)
export interface SuggestionsResult {
  success: boolean;
  message?: string;
  recipes: SuggestedRecipe[];
}

// Validation des entrées : date ISO obligatoire, tag optionnel
const suggestionsInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ)'),
  tag: z.string().trim().min(1).optional(),
});

// F03 - proposition de repas : 3 recettes tirées au hasard (SQL
// ORDER BY RANDOM() LIMIT 3), en EXCLUANT les recettes déjà planifiées dans
// la fenêtre antidoublon de l'utilisateur autour de la date demandée
// (même règle que la planification, F09). Le tag optionnel filtre
// recipes.tags par contenu, insensible à la casse.
export async function suggestRecipes(opts: {
  date: string;
  tag?: string;
}): Promise<SuggestionsResult> {
  try {
    const session = await requireSession();
    const userId = session.user?.id;

    const parsed = suggestionsInput.safeParse(opts);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
        recipes: [],
      };
    }

    const minDays = userId ? await getUserMinDaysBetween(userId) : 0;

    const recipes = await findSuggestableRecipes({
      date: parsed.data.date,
      minDays,
      tag: parsed.data.tag,
      limit: 3,
    });

    return { success: true, recipes };
  } catch (error) {
    console.error('Erreur lors de la génération des suggestions:', error);
    return {
      success: false,
      message: 'Impossible de récupérer les suggestions',
      recipes: [],
    };
  }
}
