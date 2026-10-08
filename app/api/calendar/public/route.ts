import { NextRequest } from 'next/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mealPlans, recipes } from '@/lib/db/schema';
import { validateAccessToken } from '@/app/actions/tokens';

// Libellés des types de repas en français
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner',
};

// Ordre chronologique des types de repas
const MEAL_TYPE_ORDER: string[] = ['breakfast', 'lunch', 'snack', 'dinner'];

// API JSON publique (préparation Home Assistant) : les repas planifiés
// aujourd'hui -> +90 jours, accessibles uniquement via un jeton valide.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return Response.json({ error: 'Jeton requis' }, { status: 401 });
  }

  // Les deux types de jeton donnent accès à cette API
  const record = await validateAccessToken(token, ['api', 'calendar_read']);

  if (!record) {
    return Response.json({ error: 'Jeton invalide ou expiré' }, { status: 401 });
  }

  // Période : today -> today + 90 jours (dates YYYY-MM-DD, fuseau local)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const start = `${year}-${month}-${day}`;

  const end = new Date(now);
  end.setDate(end.getDate() + 90);
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

  const rows = await db
    .select({
      date: mealPlans.date,
      mealType: mealPlans.mealType,
      customNote: mealPlans.customNote,
      servings: mealPlans.servings,
      recipeTitle: recipes.title,
    })
    .from(mealPlans)
    .leftJoin(recipes, eq(mealPlans.recipeId, recipes.id))
    .where(and(gte(mealPlans.date, start), lte(mealPlans.date, endStr)))
    .orderBy(asc(mealPlans.date));

  // Tri chronologique : date d'abord (comparaison ISO fiable), puis ordre
  // des types de repas au sein de la journée
  const meals = rows
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const orderA = MEAL_TYPE_ORDER.indexOf(a.mealType);
      const orderB = MEAL_TYPE_ORDER.indexOf(b.mealType);
      return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    })
    .map((meal) => ({
      date: meal.date,
      mealType: meal.mealType,
      // Titre lisible : recette, sinon note, sinon libellé du type de repas
      title: meal.recipeTitle || meal.customNote || MEAL_TYPE_LABELS[meal.mealType] || meal.mealType,
      servings: meal.servings,
    }));

  return Response.json({ meals });
}
