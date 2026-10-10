import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import PlannerBoard from '@/app/components/PlannerBoard';
import { getAppSettings } from '@/app/actions/settings';

export default async function CalendarPage() {
  // Récupérer les recettes pour le sélecteur
  const allRecipes = await db.select({
    id: recipes.id,
    title: recipes.title,
    mealCourse: recipes.mealCourse,
    prepTime: recipes.prepTime,
    cookTime: recipes.cookTime,
    defaultServings: recipes.defaultServings,
    lastServedAt: recipes.lastServedAt,
  }).from(recipes).orderBy(recipes.title);

  // Nombre de couverts par défaut (page de paramétrage)
  const settings = await getAppSettings();

  return (
    <main className="px-3 sm:px-6 py-2 sm:py-3 max-w-4xl mx-auto">
      <h1 className="sr-only">Calendrier des repas</h1>
      {/* Calendrier sur 19 jours (J → J+18) en structure 1-3-3-3-3-3-3,
          avec navigation par jour et par mois */}
      <PlannerBoard recipes={allRecipes} daysCount={19} enableMonthNavigation enableRecipePalette enableGenerator defaultServings={settings.defaultServings} />
    </main>
  );
}
