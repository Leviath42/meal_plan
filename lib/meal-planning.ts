// lib/meal-planning.ts
// Logique partagée de planification (F08 historique, F09 antidoublon,
// F03 suggestions) : utilisée à la fois par les Server Actions et par les
// tests d'exécution réelle (tmp/), qui rejouent exactement le même code.
import { and, eq, gte, isNull, lt, lte, ne, notExists, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mealPlans, recipes, users } from '@/lib/db/schema';
import type { SuggestedRecipe } from '@/app/types/meal-plan';

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

// Parser une date AAAA-MM-JJ en Date locale (minuit local, sans décalage UTC)
export function parseLocalDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Décaler une date AAAA-MM-JJ de n jours (fuseau local, format stable)
export function addDaysToDateStr(dateStr: string, days: number): string {
  const date = parseLocalDateStr(dateStr);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Formater une date AAAA-MM-JJ en français long (ex : 12 septembre 2026)
export function formatFrDate(dateStr: string): string {
  return parseLocalDateStr(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// F09 - antidoublon : intervalle minimum de l'utilisateur
// (0 = contrôle désactivé). Compte introuvable = pas de blocage.
export async function getUserMinDaysBetween(userId: string): Promise<number> {
  const [row] = await db
    .select({ minDaysBetween: users.minDaysBetween })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.minDaysBetween ?? 0;
}

// F09 - antidoublon : plan existant de la même recette dans la fenêtre
// [date - X, date + X] (comparaison lexicographique sur les dates ISO),
// en ignorant le plan excludePlanId (mise à jour du plan lui-même).
// Retourne le plan le plus proche de la date demandée, ou null.
export async function findPlanInWindow(opts: {
  recipeId: string;
  date: string;
  minDays: number;
  excludePlanId?: string;
}): Promise<{ id: string; date: string } | null> {
  const conditions = [
    eq(mealPlans.recipeId, opts.recipeId),
    gte(mealPlans.date, addDaysToDateStr(opts.date, -opts.minDays)),
    lte(mealPlans.date, addDaysToDateStr(opts.date, opts.minDays)),
  ];
  if (opts.excludePlanId) {
    conditions.push(ne(mealPlans.id, opts.excludePlanId));
  }

  const rows = await db
    .select({ id: mealPlans.id, date: mealPlans.date })
    .from(mealPlans)
    .where(and(...conditions));

  if (rows.length === 0) return null;

  // Plan le plus proche de la date demandée : message d'erreur plus utile
  const target = parseLocalDateStr(opts.date).getTime();
  rows.sort(
    (a, b) =>
      Math.abs(parseLocalDateStr(a.date).getTime() - target) -
      Math.abs(parseLocalDateStr(b.date).getTime() - target),
  );
  return rows[0];
}

// F09 - message de refus antidoublon (affiché tel quel dans l'interface)
export function antidoublonMessage(conflictDate: string, minDays: number): string {
  return `Cette recette est déjà planifiée le ${formatFrDate(conflictDate)} — l'intervalle minimum est de ${minDays} jours (modifiable dans Paramètres)`;
}

// F03 - suggestions : recettes candidates pour une date, en excluant celles
// déjà planifiées dans la fenêtre antidoublon de l'utilisateur (même règle
// que F09) et en filtrant optionnellement par tag (insensible à la casse).
// Sélection au hasard (SQL ORDER BY RANDOM() LIMIT n), puis tri secondaire :
// les plus anciennement servis d'abord (jamais servis en tête).
export async function findSuggestableRecipes(opts: {
  date: string;
  minDays: number;
  tag?: string;
  limit?: number;
}): Promise<SuggestedRecipe[]> {
  const conditions: SQL[] = [];
  if (opts.minDays > 0) {
    conditions.push(
      notExists(
        db
          .select({ one: sql`1` })
          .from(mealPlans)
          .where(
            and(
              eq(mealPlans.recipeId, recipes.id),
              gte(mealPlans.date, addDaysToDateStr(opts.date, -opts.minDays)),
              lte(mealPlans.date, addDaysToDateStr(opts.date, opts.minDays)),
            ),
          ),
      ),
    );
  }
  if (opts.tag) {
    const needle = `%${opts.tag.toLowerCase()}%`;
    conditions.push(sql`lower(coalesce(${recipes.tags}, '')) LIKE ${needle}`);
  }

  const rows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      mealCourse: recipes.mealCourse,
      lastServedAt: recipes.lastServedAt,
    })
    .from(recipes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`RANDOM()`)
    .limit(opts.limit ?? 3);

  // Tri secondaire (jamais servis d'abord, puis les plus anciennement servis)
  const servedTime = (value: string | null): number =>
    value ? parseLocalDateStr(value).getTime() : Number.NEGATIVE_INFINITY;
  rows.sort((a, b) => servedTime(a.lastServedAt) - servedTime(b.lastServedAt));
  return rows;
}
