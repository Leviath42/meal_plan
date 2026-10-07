import { z } from 'zod';

export const ingredientInput = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  category: z.string().min(1),
  defaultUnit: z.string().min(1),
});

const recipeIngredientInput = z.object({
  ingredientId: z.string().uuid(),
  quantity: z.coerce.number().gt(0, 'La quantité doit être supérieure à 0'),
  unit: z.string().min(1, 'L\'unité est requise'),
  note: z.string().optional().nullable(),
});

export const recipeInput = z.object({
  title: z.string().min(1, 'Titre requis').max(150),
  description: z.string().optional().nullable(),
  prepTime: z.coerce.number().int().min(0),
  cookTime: z.coerce.number().int().min(0),
  defaultServings: z.coerce.number().int().min(1).default(3),
  instructions: z.string().min(1, 'Les étapes sont requises'),
  tags: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  mealCourse: z.string().optional().nullable(),
  // ✅ Ingrédients maintenant optionnels avec valeur par défaut
  ingredients: z.array(recipeIngredientInput).default([]),
});
