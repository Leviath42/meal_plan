import { db } from '@/lib/db';
import { recipes, mealPlans } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import DndCalendarWrapper from './DndCalendarWrapper';

export default async function CalendarPage() {
  // Récupérer les recettes pour le sélecteur
  const allRecipes = await db.select({
    id: recipes.id,
    title: recipes.title,
  }).from(recipes).orderBy(recipes.title);

  // Récupérer les repas déjà planifiés pour pré-remplir si besoin
  const allMealPlans = await db.select().from(mealPlans).orderBy(desc(mealPlans.date));

  return (
    <main className="px-3 sm:px-6 py-4 max-w-4xl mx-auto">
      <div className="text-center py-4 sm:py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
          Calendrier des Repas
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Planifiez vos repas pour la semaine en cours - Glisser-déposer activé !
        </p>
        
        {/* Composant Calendrier avec DndContext */}
        <DndCalendarWrapper recipes={allRecipes} />
      </div>
    </main>
  );
}
