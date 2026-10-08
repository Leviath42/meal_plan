import { z } from 'zod';

// Preset de période accepté pour la génération (à partir d'aujourd'hui) ;
// les autres durées passent par le mode « dates précises »
export const SHOPPING_PERIOD_PRESETS = [7] as const;
export type ShoppingPeriodPreset = (typeof SHOPPING_PERIOD_PRESETS)[number];

// Sélection de période pour la génération de la liste : soit un preset
// (X jours à partir d'aujourd'hui), soit une plage de dates précise
// (YYYY-MM-DD, début inclus, fin incluse).
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const shoppingPeriodInput = z
  .object({
    mode: z.enum(['preset', 'custom']),
    days: z.coerce.number().int().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'preset') {
      if (!(SHOPPING_PERIOD_PRESETS as readonly number[]).includes(data.days ?? -1)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['days'],
          message: 'Période invalide (7 jours)',
        });
      }
      return;
    }
    if (!data.startDate || !ISO_DATE_REGEX.test(data.startDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: 'Date de début invalide' });
    }
    if (!data.endDate || !ISO_DATE_REGEX.test(data.endDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Date de fin invalide' });
    }
    if (
      data.startDate && data.endDate &&
      ISO_DATE_REGEX.test(data.startDate) && ISO_DATE_REGEX.test(data.endDate) &&
      data.startDate > data.endDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'La date de fin doit suivre la date de début',
      });
    }
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
