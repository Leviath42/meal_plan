import { NextRequest } from 'next/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mealPlans, recipes } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { validateAccessToken } from '@/app/actions/tokens';

// Date locale au format YYYY-MM-DD (les dates du planning sont comparées
// lexicographiquement, le fuseau du serveur fait foi)
function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parser une date YYYY-MM-DD en Date locale (minuit local, sans décalage UTC)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Échapper un texte ICS (RFC 5545) : antislash, point-virgule, virgule,
// retours à la ligne
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n');
}

// Libellés des types de repas en français
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner',
};

// Ordre chronologique des types de repas
const MEAL_TYPE_ORDER: string[] = ['breakfast', 'lunch', 'snack', 'dinner'];

// Repas planifiés today -> today + 90 jours, avec le titre de la recette
async function fetchSharedMeals(startDate: string, endDate: string) {
  const rows = await db
    .select({
      id: mealPlans.id,
      date: mealPlans.date,
      mealType: mealPlans.mealType,
      customNote: mealPlans.customNote,
      servings: mealPlans.servings,
      recipeTitle: recipes.title,
    })
    .from(mealPlans)
    .leftJoin(recipes, eq(mealPlans.recipeId, recipes.id))
    .where(and(gte(mealPlans.date, startDate), lte(mealPlans.date, endDate)))
    .orderBy(asc(mealPlans.date));

  // Tri chronologique : date d'abord (comparaison ISO fiable), puis ordre
  // des types de repas au sein de la journée
  return rows.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const orderA = MEAL_TYPE_ORDER.indexOf(a.mealType);
    const orderB = MEAL_TYPE_ORDER.indexOf(b.mealType);
    return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
  });
}

// Export ICS du planning : aujourd'hui -> +90 jours
export async function GET(request: NextRequest) {
  // Autorisation : session valide OU jeton d'accès (calendar_read ou api)
  let authorized = false;
  const session = await auth();
  if (session?.user?.id) {
    authorized = true;
  } else {
    const token = request.nextUrl.searchParams.get('token');
    if (token) {
      const record = await validateAccessToken(token, ['calendar_read', 'api']);
      authorized = record !== null;
    }
  }

  if (!authorized) {
    return new Response('Non autorisé', { status: 401 });
  }

  // Période : today -> today + 90 jours (comparaison lexicographique)
  const today = new Date();
  const start = toLocalDateStr(today);
  const end = toLocalDateStr(new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000));
  const meals = await fetchSharedMeals(start, end);

  // Timestamp ICS de génération (UTC, format de base)
  const dtstamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MealPlan//FR',
    'CALSCALE:GREGORIAN',
  ];

  for (const meal of meals) {
    const dateCompact = meal.date.replace(/-/g, '');
    // DTEND exclusif : jour suivant
    const nextDay = parseLocalDate(meal.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const dateEndCompact = toLocalDateStr(nextDay).replace(/-/g, '');

    // Titre : recette, sinon note personnalisée, sinon libellé du type de repas
    const summary =
      meal.recipeTitle ||
      meal.customNote ||
      MEAL_TYPE_LABELS[meal.mealType] ||
      meal.mealType;

    const mealTypeLabel = MEAL_TYPE_LABELS[meal.mealType] || meal.mealType;
    const description = `${mealTypeLabel} — ${meal.servings} couverts`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${meal.id}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateCompact}`,
      `DTEND;VALUE=DATE:${dateEndCompact}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  // Les retours à la ligne ICS sont CRLF (RFC 5545)
  const ics = lines.join('\r\n') + '\r\n';

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="meal-plan.ics"',
    },
  });
}
