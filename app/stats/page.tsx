import { db } from '@/lib/db';
import { mealPlans, recipes } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireSession } from '@/lib/auth-guards';
import { formatNumericDate } from '@/lib/format';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Statistiques — Meal Plan' };

// F13 — Statistiques d'usage, en lecture seule sur les données existantes.
// Quatre indicateurs : recettes les plus cuisinées, répartition par type de
// plat, utilisation du catalogue, volume de planification par mois.
export default async function StatsPage() {
  await requireSession();

  // --- 1. Top des recettes les plus cuisinées (tous temps) ---
  const topRecipes = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      mealCourse: recipes.mealCourse,
      planCount: sql<number>`count(${mealPlans.id})`,
    })
    .from(mealPlans)
    .innerJoin(recipes, eq(mealPlans.recipeId, recipes.id))
    .groupBy(recipes.id, recipes.title, recipes.mealCourse)
    .orderBy(sql`count(${mealPlans.id}) desc`)
    .limit(10);

  // --- 2. Répartition des repas planifiés par type de plat ---
  const byCourse = await db
    .select({
      mealCourse: sql<string>`coalesce(${mealPlans.mealCourse}, 'sans type')`,
      planCount: sql<number>`count(*)`,
    })
    .from(mealPlans)
    .where(sql`${mealPlans.recipeId} is not null`)
    .groupBy(mealPlans.mealCourse)
    .orderBy(sql`count(*) desc`);

  // --- 3. Utilisation du catalogue ---
  const [catalog] = await db
    .select({ total: sql<number>`count(*)` })
    .from(recipes);
  const [plannedOnce] = await db
    .select({ count: sql<number>`count(distinct ${mealPlans.recipeId})` })
    .from(mealPlans)
    .where(sql`${mealPlans.recipeId} is not null`);
  const [neverPlanned] = await db
    .select({ count: sql<number>`count(*)` })
    .from(recipes)
    .where(
      sql`${recipes.id} not in (select distinct recipe_id from meal_plans where recipe_id is not null)`
    );

  // --- 4. Repas planifiés par mois (12 derniers) ---
  const byMonth = await db
    .select({
      month: sql<string>`substr(${mealPlans.date}, 1, 7)`,
      planCount: sql<number>`count(*)`,
    })
    .from(mealPlans)
    .groupBy(sql`substr(${mealPlans.date}, 1, 7)`)
    .orderBy(sql`substr(${mealPlans.date}, 1, 7) desc`)
    .limit(12);

  // --- 5. Repas sans recette (notes libres) pour le contexte ---
  const [freeNotes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mealPlans)
    .where(sql`${mealPlans.recipeId} is null`);

  const totalPlans =
    byCourse.reduce((sum, row) => sum + Number(row.planCount), 0) +
    Number(freeNotes?.count ?? 0);
  const usedPct =
    catalog && catalog.total > 0
      ? Math.round((Number(plannedOnce?.count ?? 0) / Number(catalog.total)) * 100)
      : 0;

  const maxMonth = Math.max(1, ...byMonth.map((r) => Number(r.planCount)));
  const maxCourse = Math.max(1, ...byCourse.map((r) => Number(r.planCount)));
  const COURSE_LABELS: Record<string, string> = {
    'apéritif': 'Apéritif',
    'entrée': 'Entrée',
    'plat': 'Plat principal',
    'accompagnement': 'Accompagnement',
    'dessert': 'Dessert',
    'boisson': 'Boisson',
    'sans type': 'Sans type de plat',
  };

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-lg sm:text-xl font-bold">Statistiques</h1>
        <p className="text-xs sm:text-sm text-gray-500">
          {totalPlans} repas planifiés au total — {catalog?.total ?? 0} recettes au catalogue.
        </p>

        {/* Utilisation du catalogue */}
        <section className="bg-white rounded-lg shadow-sm p-3">
          <h2 className="text-sm sm:text-base font-semibold mb-2">Utilisation du catalogue</h2>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                <span>Recettes déjà planifiées au moins une fois</span>
                <span>
                  {plannedOnce?.count ?? 0} / {catalog?.total ?? 0} ({usedPct}%)
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${usedPct}%` }}
                  role="progressbar"
                  aria-valuenow={usedPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {neverPlanned?.count ?? 0} recette{Number(neverPlanned?.count ?? 0) > 1 ? 's' : ''} jamais
              planifiée{Number(neverPlanned?.count ?? 0) > 1 ? 's' : ''} — {freeNotes?.count ?? 0} repas
              en note libre (« soirée pizza »…) hors recettes.
            </p>
          </div>
        </section>

        {/* Top recettes */}
        <section className="bg-white rounded-lg shadow-sm p-3">
          <h2 className="text-sm sm:text-base font-semibold mb-2">Recettes les plus cuisinées</h2>
          {topRecipes.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500">
              Aucun repas planifié pour le moment — planifiez des repas pour voir vos statistiques.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {topRecipes.map((recipe, index) => (
                <li key={recipe.id} className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="w-5 text-gray-400 text-right flex-shrink-0">{index + 1}.</span>
                  <span className="flex-1 min-w-0 truncate font-medium">{recipe.title}</span>
                  {recipe.mealCourse && (
                    <span className="text-xs text-gray-400 hidden sm:inline flex-shrink-0">
                      {COURSE_LABELS[recipe.mealCourse] ?? recipe.mealCourse}
                    </span>
                  )}
                  <span className="text-gray-500 flex-shrink-0">
                    {Number(recipe.planCount)}×
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Répartition par type de plat */}
        <section className="bg-white rounded-lg shadow-sm p-3">
          <h2 className="text-sm sm:text-base font-semibold mb-2">Répartition par type de plat</h2>
          {byCourse.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500">Pas encore de données.</p>
          ) : (
            <ul className="space-y-2">
              {byCourse.map((row) => {
                const pct = Math.round((Number(row.planCount) / maxCourse) * 100);
                return (
                  <li key={row.mealCourse}>
                    <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                      <span>{COURSE_LABELS[row.mealCourse] ?? row.mealCourse}</span>
                      <span>{Number(row.planCount)} repas</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Volume mensuel */}
        <section className="bg-white rounded-lg shadow-sm p-3">
          <h2 className="text-sm sm:text-base font-semibold mb-2">Repas planifiés par mois</h2>
          {byMonth.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500">Pas encore de données.</p>
          ) : (
            <ul className="space-y-2">
              {byMonth.map((row) => {
                const pct = Math.round((Number(row.planCount) / maxMonth) * 100);
                const [year, month] = row.month.split('-');
                const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric',
                });
                return (
                  <li key={row.month}>
                    <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                      <span className="capitalize">{label}</span>
                      <span>{Number(row.planCount)}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-xs text-gray-400 text-center">
          Statistiques calculées sur l'ensemble des repas planifiés (y compris passés).
          Dernière mise à jour de cette page : {formatNumericDate(new Date())}.
        </p>
      </div>
    </main>
  );
}
