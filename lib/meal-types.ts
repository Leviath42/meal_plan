// lib/meal-types.ts
// Constantes partagées des types de repas : libellés français, couleurs
// (classes de catégorie, pas l'accent UI), ordre chronologique et types
// de plats. Source unique autrefois dupliquée dans PlannerBoard, la page
// publique et le générateur.

import type { MealType } from '@/app/types/meal-plan';

// Libellés courts français (calendrier principal) ; la page publique et le
// générateur utilisent la variante longue ci-dessous.
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déj',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner',
};

// Variante longue (page publique, générateur)
export const MEAL_TYPE_LABELS_LONG: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner',
};

// Couleurs de catégorie par type de repas (pas l'accent UI)
export const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: 'bg-orange-100 text-orange-800',
  lunch: 'bg-blue-100 text-blue-800',
  snack: 'bg-green-100 text-green-800',
  dinner: 'bg-purple-100 text-purple-800',
};

// Ordre chronologique des types de repas
export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

// Ordre chronologique des types de plats dans un repas
export const MEAL_COURSE_ORDER: string[] = ['apéritif', 'entrée', 'plat', 'accompagnement', 'dessert', 'boisson'];
