import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import PlannerBoard from '@/app/components/PlannerBoard';

export default async function CalendarPage() {
  // Récupérer les recettes pour le sélecteur
  const allRecipes = await db.select({
    id: recipes.id,
    title: recipes.title,
    mealCourse: recipes.mealCourse,
    prepTime: recipes.prepTime,
    cookTime: recipes.cookTime,
    defaultServings: recipes.defaultServings,
  }).from(recipes).orderBy(recipes.title);

  return (
    <main className="px-3 sm:px-6 py-2 sm:py-3 max-w-4xl mx-auto">
      {/* Calendrier sur 19 jours (J → J+18) en structure 1-3-3-3-3-3-3,
          avec navigation par jour et par mois */}
      <PlannerBoard recipes={allRecipes} daysCount={19} enableMonthNavigation />
    </main>
  );
}
