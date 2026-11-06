import { z } from 'zod';

// F11 — Garde-manger : validation des entrées serveur et vues de la page
// /pantry. La quantité est un réel (200.5 g accepté), l'unité est libre,
// la péremption est une date ISO YYYY-MM-DD optionnelle.

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Saisie d'une ligne de stock (création ou édition : une seule ligne par
// ingrédient, l'action fait un upsert sur ingredient_id unique)
export const pantryItemInput = z.object({
  ingredientId: z
    .string()
    .trim()
    .min(1, "L'ingrédient est requis")
    .max(100, 'Identifiant invalide'),
  quantity: z.coerce
    .number()
    .positive('La quantité doit être supérieure à 0')
    .max(100000, 'Quantité trop élevée'),
  unit: z.string().trim().min(1, "L'unité est requise").max(30, 'Maximum 30 caractères'),
  // Champ date optionnel : absent OU vide (formulaire sans date choisie)
  expiresAt: z
    .union([z.literal(''), z.string().trim().regex(ISO_DATE_REGEX, 'Date de péremption invalide')])
    .optional()
    .transform((value) => (value ? value : null)),
});

export type PantryItemInput = z.infer<typeof pantryItemInput>;

// Ligne de stock telle qu'affichée (jointure pantry_items <->
// ingredients résolue côté serveur + alerte de péremption calculée)
export interface PantryItemView {
  id: string;
  ingredientId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiresAt: string | null;
  // Date du jour local (YYYY-MM-DD) servant au calcul de l'alerte :
  // le badge « périmé » est affiché côté client pour péremption <= ce jour
  expired: boolean;
}

// État renvoyé par la Server Action de formulaire (style shopping.ts)
export type PantryFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
} | null;
