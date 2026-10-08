import Link from 'next/link';
import { formatWeekdayDayMonthYear } from '@/lib/format';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mealPlans, recipes } from '@/lib/db/schema';
import { validateAccessToken } from '@/app/actions/tokens';

// Parser une date YYYY-MM-DD en Date locale (minuit local, sans décalage UTC)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Libellés des types de repas en français
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner',
};

// Couleurs pour chaque type de repas
const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-orange-100 text-orange-800',
  lunch: 'bg-blue-100 text-blue-800',
  snack: 'bg-green-100 text-green-800',
  dinner: 'bg-purple-100 text-purple-800',
};

// Ordre chronologique des types de repas
const MEAL_TYPE_ORDER: string[] = ['breakfast', 'lunch', 'snack', 'dinner'];

interface PublicCalendarPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function PublicCalendarPage({ searchParams }: PublicCalendarPageProps) {
  // searchParams est une Promise dans Next.js 16
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token;

  // Message d'erreur générique : ne jamais expliquer pourquoi le lien échoue
  if (!token) {
    return <InvalidLink />;
  }

  const record = await validateAccessToken(token, ['calendar_read', 'api']);

  if (!record) {
    return <InvalidLink />;
  }

  // Période : today -> today + 30 jours (dates YYYY-MM-DD, fuseau local)
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const end = new Date(now);
  end.setDate(end.getDate() + 30);
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

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
    .where(and(gte(mealPlans.date, start), lte(mealPlans.date, endStr)))
    .orderBy(asc(mealPlans.date));

  // Grouper par date (triées), puis trier chaque jour par type de repas
  const mealsByDate = new Map<string, typeof rows>();
  for (const meal of rows) {
    const list = mealsByDate.get(meal.date) ?? [];
    list.push(meal);
    mealsByDate.set(meal.date, list);
  }

  const mealTypeRank = (mealType: string) => {
    const index = MEAL_TYPE_ORDER.indexOf(mealType);
    return index === -1 ? 99 : index;
  };

  return (
    <main className="px-3 sm:px-4 py-2 sm:py-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-3 px-2">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">
            Planning des repas
          </h1>
          <span className="text-xs text-gray-400">Lecture seule — Meal Plan</span>
        </div>

        {mealsByDate.size === 0 ? (
          <p className="text-xs sm:text-sm text-gray-500 px-2">
            Aucun repas planifié pour les 30 prochains jours.
          </p>
        ) : (
          <div className="space-y-2">
            {[...mealsByDate.entries()].map(([date, meals]) => (
              <div
                key={date}
                className="bg-white rounded-lg shadow-sm p-3 max-w-2xl mx-auto"
              >
                <h2 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 capitalize">
                  {formatWeekdayDayMonthYear(parseLocalDate(date))}
                </h2>
                <ul className="space-y-1.5">
                  {[...meals]
                    .sort((a, b) => mealTypeRank(a.mealType) - mealTypeRank(b.mealType))
                    .map((meal) => (
                      <li key={meal.id} className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${MEAL_TYPE_COLORS[meal.mealType] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {MEAL_TYPE_LABELS[meal.mealType] || meal.mealType}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-800 truncate">
                          {meal.recipeTitle || meal.customNote || MEAL_TYPE_LABELS[meal.mealType] || meal.mealType}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                          {meal.servings} couverts
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          Lecture seule — Meal Plan
        </p>
      </div>
    </main>
  );
}

// Écran « Lien invalide ou expiré » (jeton absent, révoqué ou expiré)
function InvalidLink() {
  return (
    <main className="px-3 sm:px-4 py-2 sm:py-3">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-4 mt-6 text-center">
        <h1 className="text-lg font-bold text-gray-800 mb-2">
          Lien invalide ou expiré
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mb-3">
          Ce lien de partage n&apos;est plus valide. Demandez un nouveau lien à un
          administrateur.
        </p>
        <Link
          href="/login"
          className="inline-block bg-accent text-white rounded px-3 py-1.5 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Se connecter
        </Link>
      </div>
    </main>
  );
}
