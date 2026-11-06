import { sql, type SQL } from 'drizzle-orm';
import { recipes, ingredients } from './db/schema';

// F07 : comparaisons insensibles à la casse pour SQLite. SQLite n'a pas
// d'opérateur ILIKE : `ilike()` de drizzle-orm (opérateur PostgreSQL) y
// génère du SQL invalide (« near "ilike": syntax error ») et fait planter
// l'action serveur à chaque import (C-055). LOWER() des deux côtés est le
// portable (ne plie que les caractères ASCII, suffisant pour les titres et
// noms d'ingrédients français sans casse accentuée).
//
// Ces helpers sont partagés entre l'action (`app/actions/import-recipe.ts`)
// et le test runtime (`scripts/test-import-recipe.ts`) : le test exécute
// les MÊMES requêtes que le code réel, jamais une réplique qui pourrait
// masquer une régression SQL.

export function recipeTitleEqualsIgnoreCase(title: string): SQL {
  return sql`LOWER(${recipes.title}) = LOWER(${title})`;
}

export function ingredientNameEqualsIgnoreCase(name: string): SQL {
  return sql`LOWER(${ingredients.name}) = LOWER(${name})`;
}
