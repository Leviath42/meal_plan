import { z } from 'zod';

export const ingredientInput = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  category: z.string().min(1, 'Catégorie requise').max(80),
  defaultUnit: z.string().min(1, 'Unité requise').max(30),
});