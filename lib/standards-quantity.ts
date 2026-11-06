// lib/standards-quantity.ts — F16 : mise à l'échelle des quantités standard.
//
// Partie PURE de lib/standards.ts (aucun import de base) : consommée à la
// fois par les composants CLIENT (le sélecteur d'ingrédients pré-remplit la
// quantité) et par les tests runtime — better-sqlite3 ne doit jamais entrer
// dans le graphe client (le build Turbopack le refuse).

export interface IngredientStandard {
  ingredientId: string;
  quantity: number;
  unit: string;
  servingsRef: number;
}

// Index par ingredient_id, consommé par les pages de création/édition
export type IngredientStandardsMap = Record<string, IngredientStandard>;

// Mise à l'échelle par couverts : le standard exprime `quantity` pour
// `servingsRef` personnes (ail : 1 gousse pour 4) → quantité pour `servings`
// couverts. Arrondi à 2 décimales (1 gousse/4 pers × 6 = 1,5).
// Retourne null si `servings` est absent/invalide : pas de pré-remplissage.
export function scaleStandardQuantity(
  standard: { quantity: number; servingsRef: number },
  servings: number | null | undefined
): number | null {
  if (servings == null || !Number.isFinite(servings) || servings <= 0) {
    return null;
  }
  if (
    !Number.isFinite(standard.quantity) ||
    !Number.isFinite(standard.servingsRef) ||
    standard.servingsRef <= 0
  ) {
    return null;
  }
  const scaled = (standard.quantity * servings) / standard.servingsRef;
  // Éviter -0 et les artefacts flottants (0.30000000000000004)
  const rounded = Math.round(scaled * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

// Formate pour un <input type="number"> (valeur JS, séparateur décimal point)
export function formatStandardQuantity(value: number): string {
  return String(value);
}
