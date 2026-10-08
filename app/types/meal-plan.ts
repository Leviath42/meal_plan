import { z } from 'zod';

// Type Recipe pour la compatibilité
export interface Recipe {
  id: string;
  title: string;
  mealCourse?: string | null;
  // Temps de préparation / cuisson en minutes, pour l'info-bulle du calendrier
  prepTime?: number;
  cookTime?: number;
  defaultServings?: number;
  // Date (AAAA-MM-JJ) du dernier repas planifié avec cette recette (F08 - historique)
  lastServedAt?: string | null;
}

// Schéma de validation pour les repas planifiés
export const mealPlanInput = z.object({
  // Format ISO AAAA-MM-JJ obligatoire (les comparaisons de dates sont lexicographiques)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ)'),
  mealType: z.enum(['breakfast', 'lunch', 'snack', 'dinner'], { message: 'Type de repas invalide' }),
  recipeId: z.string().uuid().optional().nullable(),
  customNote: z.string().optional().nullable(),
  servings: z.coerce.number().int().min(1, 'Au moins 1 couvert requis').max(20, 'Maximum 20 couverts').default(4),
  mealCourse: z.string().optional().nullable(),
});

// Types pour l'état du formulaire
export type MealPlanFormState = {
  errors?: Record<string, string[]>;
  values?: Record<string, string | number>;
} | null;

// Types pour les données de repas planifié
export interface MealPlan {
  id: string;
  date: string;
  mealType: string;
  recipeId: string | null;
  customNote: string | null;
  servings: number;
  mealCourse: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Types pour les types de repas
export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

// Types pour le résultat du formulaire
export interface MealPlanFormResult {
  success: boolean;
  message: string;
  mealPlan?: MealPlan;
  errors?: Record<string, string[]>;
}

// Proposition de recette (F03) renvoyée par suggestRecipes
export interface SuggestedRecipe {
  id: string;
  title: string;
  mealCourse: string | null;
  // Date (AAAA-MM-JJ) du dernier repas planifié avec cette recette
  lastServedAt: string | null;
}
