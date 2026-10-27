// scripts/seed-demo-planning.ts
// Prépare le planning de l'instance de démonstration publique :
// - une semaine complète de repas à partir d'aujourd'hui (déjeuners + dîners,
//   goûters, une note libre « soirée pizza ») ;
// - si aucun historique n'existe, ~3 semaines de repas passés pour nourrir
//   les stats et l'indicateur « déjà servi » (F08/F09) ;
// - recalcule recipes.last_served_at à partir des repas passés.
// Idempotent : les repas d'aujourd'hui et du futur sont supprimés avant
// réinsertion — sûr à exécuter chaque nuit (cron du reset démo).
// Usage : npm run db:seed-demo-planning (après npm run seed)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { gte, lt, sql } from 'drizzle-orm';
import * as schema from '../lib/db/schema';

// Connexion directe à la base (pas le singleton Next), même pattern que lib/db/seed.ts
const sqlite = new Database('data/sqlite.db');
const db = drizzle(sqlite, { schema });
const { recipes, mealPlans } = schema;

const DEMO_SERVINGS = 4;
const NOTE_SOIREE_PIZZA = 'Soirée pizza 🍕';

// Date locale (fuseau du conteneur = Europe/Paris) au format YYYY-MM-DD,
// même logique que todayLocalStr (app/actions/generator.ts)
function localDateStr(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + mm + '-' + dd;
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateStr(date);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// File de recettes sans doublon dans la fenêtre antidoublon (7 j) :
// pioche séquentielle dans une liste mélangée, reconstituée à épuisement.
class RecipeQueue {
  private pool: string[] = [];
  private index = 0;
  private recent: string[] = [];

  constructor(private readonly source: string[]) {}

  next(): string | undefined {
    if (this.source.length === 0) return undefined;
    for (let attempt = 0; attempt < this.source.length * 3; attempt++) {
      if (this.index >= this.pool.length) {
        this.pool = shuffle(this.source);
        this.index = 0;
      }
      const candidate = this.pool[this.index++];
      if (this.recent.includes(candidate)) continue;
      this.recent.push(candidate);
      if (this.recent.length > 7) this.recent.shift();
      return candidate;
    }
    return this.source[0]; // dernier recours : mieux vaut un doublon qu'un créneau vide
  }
}

interface DemoMeal {
  date: string;
  mealType: 'lunch' | 'snack' | 'dinner';
  recipeId: string | null;
  customNote: string | null;
  mealCourse: string | null;
}

async function main(): Promise<void> {
  const today = localDateStr(new Date());

  const allRecipes = await db
    .select({ id: recipes.id, mealCourse: recipes.mealCourse })
    .from(recipes);
  const courseById = new Map<string, string | null>();
  for (const recipe of allRecipes) {
    courseById.set(recipe.id, recipe.mealCourse ?? null);
  }
  const plats = allRecipes.filter((r) => r.mealCourse === 'plat').map((r) => r.id);
  const desserts = allRecipes.filter((r) => r.mealCourse === 'dessert').map((r) => r.id);

  if (plats.length < 2) {
    console.error('Pas assez de recettes « plat » — lancer d\u2019abord npm run seed');
    process.exit(1);
  }

  // 1. Idempotence : purger aujourd'hui + futur
  db.delete(mealPlans).where(gte(mealPlans.date, today)).run();

  const now = new Date().toISOString();
  const insertMeals = (meals: DemoMeal[]): void => {
    for (const meal of meals) {
      db.insert(mealPlans)
        .values({
          date: meal.date,
          mealType: meal.mealType,
          recipeId: meal.recipeId,
          customNote: meal.customNote,
          servings: DEMO_SERVINGS,
          mealCourse: meal.mealCourse,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
  };

  // 2. Semaine à venir : déjeuner + dîner chaque jour, goûters, une note libre
  const platQueue = new RecipeQueue(plats);
  const dessertQueue = new RecipeQueue(desserts.length > 0 ? desserts : plats);
  const week: DemoMeal[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(today, offset);

    const lunchId = platQueue.next();
    if (lunchId) {
      week.push({
        date,
        mealType: 'lunch',
        recipeId: lunchId,
        customNote: null,
        mealCourse: courseById.get(lunchId) ?? null,
      });
    }

    if (offset === 3) {
      // Planifier sans recette est une vraie fonctionnalité — autant la montrer
      week.push({ date, mealType: 'dinner', recipeId: null, customNote: NOTE_SOIREE_PIZZA, mealCourse: null });
    } else {
      const dinnerId = platQueue.next();
      if (dinnerId) {
        week.push({
          date,
          mealType: 'dinner',
          recipeId: dinnerId,
          customNote: null,
          mealCourse: courseById.get(dinnerId) ?? null,
        });
      }
    }

    if ((offset === 2 || offset === 5) && desserts.length > 0) {
      const snackId = dessertQueue.next();
      if (snackId) {
        week.push({
          date,
          mealType: 'snack',
          recipeId: snackId,
          customNote: null,
          mealCourse: courseById.get(snackId) ?? null,
        });
      }
    }
  }

  // 3. Historique fictif (une seule fois) : stats + indicateur « déjà servi »
  const pastMeals = db
    .select({ id: mealPlans.id })
    .from(mealPlans)
    .where(lt(mealPlans.date, today))
    .all();
  if (pastMeals.length === 0) {
    const historyQueue = new RecipeQueue(plats);
    const history: DemoMeal[] = [];
    for (let daysAgo = 2; daysAgo <= 24; daysAgo += 2) {
      const date = addDays(today, -daysAgo);
      for (const mealType of ['lunch', 'dinner'] as const) {
        const recipeId = historyQueue.next();
        if (recipeId) {
          history.push({
            date,
            mealType,
            recipeId,
            customNote: null,
            mealCourse: courseById.get(recipeId) ?? null,
          });
        }
      }
    }
    insertMeals(history);
    console.log('Passé : ' + history.length + ' repas fictifs insérés (J-24 → J-2)');
  }

  insertMeals(week);
  console.log('Semaine : ' + week.length + ' repas insérés (' + today + ' → ' + addDays(today, 6) + ')');

  // 4. F08 : recalculer la date du dernier service (indicateur « • » du calendrier)
  db.run(sql`
    UPDATE recipes
    SET last_served_at = (
      SELECT MAX(date) FROM meal_plans
      WHERE meal_plans.recipe_id = recipes.id AND meal_plans.date < ${today}
    )
    WHERE EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.recipe_id = recipes.id AND meal_plans.date < ${today}
    )
  `);

  sqlite.close();
  console.log('Planning de démonstration prêt ✅');
}

main().catch((error) => {
  console.error('Erreur:', error);
  process.exit(1);
});
