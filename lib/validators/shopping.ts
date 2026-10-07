import { z } from 'zod';

// Presets de période acceptés pour la génération (à partir d'aujourd'hui)
export const SHOPPING_PERIOD_PRESETS = [7, 14, 30] as const;
export type ShoppingPeriodPreset = (typeof SHOPPING_PERIOD_PRESETS)[number];

// Sélection de période pour la génération de la liste
export const shoppingPeriodInput = z.object({
  days: z.coerce
    .number()
    .int('Période invalide')
    .refine(
      (value) => (SHOPPING_PERIOD_PRESETS as readonly number[]).includes(value),
      'Période invalide (7, 14 ou 30 jours)'
    ),
});

// Ajout manuel d'un article (nom libre, quantité, unité)
export const manualShoppingItemInput = z.object({
  name: z.string().trim().min(1, "Le nom de l'article est requis").max(100, 'Maximum 100 caractères'),
  quantity: z.coerce
    .number()
    .positive('La quantité doit être supérieure à 0')
    .max(100000, 'Quantité trop élevée'),
  unit: z.string().trim().min(1, "L'unité est requise").max(30, 'Maximum 30 caractères'),
});

// Article de liste tel qu'affiché (jointure shopping_items <-> ingredients résolue côté serveur)
export interface ShoppingItemView {
  id: string;
  // Nom de l'ingrédient, ou nom saisi à la main pour les articles libres
  name: string;
  // Rayon (catégorie de l'ingrédient), « Divers » pour les articles manuels
  category: string;
  quantity: number;
  unit: string;
  isBought: boolean;
  addedManually: boolean;
}

// État renvoyé par les Server Actions de formulaire (style meal-plan.ts)
export type ShoppingFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
} | null;
