// lib/export.ts — F18 : export JSON complet des données du foyer.
//
// Périmètre volontairement RESTREINT (contrat vague 4, W5) : recettes, liaisons
// recette-ingrédient, ingrédients, planning, garde-manger, paramètres.
// JAMAIS les secrets : mots de passe (users.password), hash de question secrète,
// sessions, jetons de partage (access_tokens), licences, clients Stripe,
// abonnements push. L'export est une LECTURE : il n'est pas soumis à la garde
// d'essai expiré du proxy (cf. GET /settings/export).

import { db } from '@/lib/db';
import {
  recipes,
  ingredients,
  recipeIngredients,
  mealPlans,
  pantryItems,
  appSettings,
} from '@/lib/db/schema';

export const EXPORT_FORMAT = 'meal-plan-export';
// Version du schéma d'export : incrémenter à chaque évolution incompatible,
// l'import refuse les versions inconnues (aucun écrit "au mieux").
export const EXPORT_VERSION = 1;

export interface ExportedRecipe {
  id: string;
  title: string;
  description: string | null;
  prepTime: number;
  cookTime: number;
  defaultServings: number;
  mealCourse: string | null;
  instructions: string;
  tags: string | null;
  source: string | null;
  created_by: string | null;
  lastServedAt: string | null;
}

export interface ExportedIngredient {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
}

export interface ExportedRecipeIngredient {
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  note: string | null;
}

export interface ExportedMealPlan {
  date: string;
  mealType: string;
  customNote: string | null;
  servings: number | null;
  mealCourse: string | null;
  recipeId: string | null;
}

export interface ExportedPantryItem {
  ingredientId: string;
  quantity: number;
  unit: string;
  expiresAt: string | null;
}

export interface ExportEnvelope {
  format: typeof EXPORT_FORMAT;
  version: number;
  exported_at: string;
  data: {
    recipes: ExportedRecipe[];
    ingredients: ExportedIngredient[];
    recipe_ingredients: ExportedRecipeIngredient[];
    meal_plans: ExportedMealPlan[];
    pantry_items: ExportedPantryItem[];
    app_settings: { defaultServings: number; theme: string } | null;
  };
}

// Lecture seule : aucune colonne des tables secrètes n'est sélectionnée.
export async function buildExportEnvelope(): Promise<ExportEnvelope> {
  const [recipeRows, ingredientRows, linkRows, mealRows, pantryRows, settingsRows] =
    await Promise.all([
      db
        .select({
          id: recipes.id,
          title: recipes.title,
          description: recipes.description,
          prepTime: recipes.prepTime,
          cookTime: recipes.cookTime,
          defaultServings: recipes.defaultServings,
          mealCourse: recipes.mealCourse,
          instructions: recipes.instructions,
          tags: recipes.tags,
          source: recipes.source,
          created_by: recipes.created_by,
          lastServedAt: recipes.lastServedAt,
        })
        .from(recipes),
      db
        .select({
          id: ingredients.id,
          name: ingredients.name,
          category: ingredients.category,
          defaultUnit: ingredients.defaultUnit,
        })
        .from(ingredients),
      db
        .select({
          recipeId: recipeIngredients.recipeId,
          ingredientId: recipeIngredients.ingredientId,
          quantity: recipeIngredients.quantity,
          unit: recipeIngredients.unit,
          note: recipeIngredients.note,
        })
        .from(recipeIngredients),
      db
        .select({
          date: mealPlans.date,
          mealType: mealPlans.mealType,
          customNote: mealPlans.customNote,
          servings: mealPlans.servings,
          mealCourse: mealPlans.mealCourse,
          recipeId: mealPlans.recipeId,
        })
        .from(mealPlans),
      db
        .select({
          ingredientId: pantryItems.ingredientId,
          quantity: pantryItems.quantity,
          unit: pantryItems.unit,
          expiresAt: pantryItems.expiresAt,
        })
        .from(pantryItems),
      db
        .select({
          defaultServings: appSettings.defaultServings,
          theme: appSettings.theme,
        })
        .from(appSettings)
        .limit(1),
    ]);

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    data: {
      recipes: recipeRows,
      ingredients: ingredientRows,
      recipe_ingredients: linkRows,
      meal_plans: mealRows,
      pantry_items: pantryRows,
      // Absente à l'installation (ligne id=1 créée à la première visite) : null
      app_settings: settingsRows[0] ?? null,
    },
  };
}
