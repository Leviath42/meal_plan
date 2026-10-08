// lib/format.ts
// Formatage partagé des quantités : arrondi à 2 décimales, virgule française,
// zéros inutiles supprimés (2.667 -> "2,67", 333.333 -> "333,33", 4 -> "4").
//
// Implémentation manuelle (pas d'Intl) : le rendu doit être strictement
// identique côté serveur et client — deux ICU différentes produisent des
// textes différents, ce que React traite comme une erreur d'hydratation.
export function formatQuantity(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const [integer, decimals] = rounded.toString().split('.');
  return decimals ? `${integer},${decimals}` : integer;
}
