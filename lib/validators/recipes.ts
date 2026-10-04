import { z } from 'zod';

export const ingredientInput = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  category: z.string().min(1),
  defaultUnit: z.string().min(1),
});

export const recipeInput = z.object({
  title: z.string().min(1, 'Titre requis').max(150),
  description: z.string().optional().nullable(),
  prepTime: z.coerce.number().int().min(0),
  cookTime: z.coerce.number().int().min(0),
  defaultServings: z.coerce.number().int().min(1).default(3),
  instructions: z.string().min(1, 'Les étapes sont requises'),
  tags: z.string().optional().nullable(),       // "Végé, Rapide"
  source: z.string().optional().nullable(),
  ingredients: z.array(z.object({
    ingredientId: z.string().uuid(),            // ou name pour création à la volée
    quantity: z.coerce.number().positive(),
    unit: z.string().min(1),
    note: z.string().optional().nullable(),
  })).min(1, 'Au moins un ingrédient'),
});