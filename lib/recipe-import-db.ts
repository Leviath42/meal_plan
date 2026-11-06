import { and, eq, sql, type SQL } from 'drizzle-orm';
import { recipes, ingredients } from './db/schema';

// F07 : comparaisons insensibles à la casse pour SQLite. SQLite n'a pas
// d'opérateur ILIKE : `ilike()` de drizzle-orm (opérateur PostgreSQL) y
// génère du SQL invalide (« near "ilike": syntax error ») et fait planter
// l'action serveur à chaque import (C-055). LOWER() des deux côtés est le
// portable (ne plie que les caractères ASCII, suffisant pour les titres et
// noms d'ingrédients français sans casse accentuée).
//
// Ces helpers sont partagés entre l'action (`app/actions/import-recipe.ts`),
// l'import JSON (`lib/import.ts`) et le test runtime
// (`scripts/test-import-recipe.ts`) : le test exécute les MÊMES requêtes que
// le code réel, jamais une réplique qui pourrait masquer une régression SQL.
//
// F17 multi-tenant (C-062) : le paramètre `householdId`, bornera la
// comparaison au foyer — l'antidoublon de titre et le rapprochement d'ingrédient
// par nom ne traversent jamais les foyers. Le code applicatif le passe
// TOUJOURS ; omis (legacy mono-foyer, tests runtime historiques), la
// comparaison reste celle d'avant le multi-tenant (compatibilité du contrat).

export function recipeTitleEqualsIgnoreCase(title: string, householdId?: string): SQL {
  const comparison = sql`LOWER(${recipes.title}) = LOWER(${title})`;
  return householdId
    ? (and(comparison, eq(recipes.householdId, householdId)) as SQL)
    : comparison;
}

export function ingredientNameEqualsIgnoreCase(name: string, householdId?: string): SQL {
  const comparison = sql`LOWER(${ingredients.name}) = LOWER(${name})`;
  return householdId
    ? (and(comparison, eq(ingredients.householdId, householdId)) as SQL)
    : comparison;
}
