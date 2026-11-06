// lib/standards.ts — F16 : quantités standard par ingrédient (contrat vague 4).
//
// Partie SERVEUR : lecture de la table `ingredient_standards` (la migration
// 0008 la pose, `scripts/seed-standards.ts` la peuple). La partie PURE
// (types + mise à l'échelle) vit dans lib/standards-quantity.ts pour rester
// importable côté client sans tirer better-sqlite3 dans le bundle.
//
// « 100 g de pâtes pour 1 personne » : la quantité est mise à l'échelle des
// couverts SAISIS (100 g/pers → 4 couverts = 400 g), reste ajustable à la
// main (la valeur saisie est seule enregistrée) et l'absence de standard
// laisse le formulaire strictement inchangé.
import { db } from '@/lib/db';
import { ingredientStandards } from '@/lib/db/schema';
import type { IngredientStandard } from './standards-quantity';

export type {
  IngredientStandard,
  IngredientStandardsMap,
} from './standards-quantity';
export {
  scaleStandardQuantity,
  formatStandardQuantity,
} from './standards-quantity';

export async function getIngredientStandards(): Promise<IngredientStandard[]> {
  const rows = await db
    .select({
      ingredientId: ingredientStandards.ingredientId,
      quantity: ingredientStandards.quantity,
      unit: ingredientStandards.unit,
      servingsRef: ingredientStandards.servingsRef,
    })
    .from(ingredientStandards);
  return rows;
}

// Index par ingredient_id, consommé par les pages de création/édition
export async function getIngredientStandardsMap(): Promise<
  Record<string, IngredientStandard>
> {
  const map: Record<string, IngredientStandard> = {};
  for (const standard of await getIngredientStandards()) {
    map[standard.ingredientId] = standard;
  }
  return map;
}
