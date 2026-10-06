import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import Calendar from '../Calendar';

export default async function CalendarPage() {
  // Récupérer les recettes pour le sélecteur
  const allRecipes = await db.select({
    id: recipes.id,
    title: recipes.title,
  }).from(recipes).orderBy(recipes.title);

  return (
    <main className="px-3 sm:px-6 py-4 max-w-4xl mx-auto">
      <div className="text-center py-4 sm:py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
          Calendrier des Repas
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Planifiez vos repas pour la semaine en cours
        </p>
        
        {/* Composant Calendrier */}
        <Calendar recipes={allRecipes} />
      </div>
    </main>
  );
}
