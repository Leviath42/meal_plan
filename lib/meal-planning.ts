// lib/meal-planning.ts
// Logique partagée de planification (F08 historique, F09 antidoublon,
// F03 suggestions) : utilisée à la fois par les Server Actions et par les
// tests d'exécution réelle (tmp/), qui rejouent exactement le même code.
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';

// Contexte de transaction better-sqlite3 (driver synchrone)
export type SqliteTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// F08 - historique : mémorise la date (AAAA-MM-JJ) du repas le plus récent
// planifié avec cette recette. Ne fait rien si une date plus récente est déjà
// connue : le champ est un historique, jamais recalculé en cas de suppression
// d'un plan ou de retrait de la recette.
export function bumpRecipeLastServedAt(tx: SqliteTx, recipeId: string, date: string): void {
  tx
    .update(recipes)
    .set({ lastServedAt: date })
    .where(
      and(
        eq(recipes.id, recipeId),
        or(isNull(recipes.lastServedAt), lt(recipes.lastServedAt, date)),
      ),
    )
    .run();
}
