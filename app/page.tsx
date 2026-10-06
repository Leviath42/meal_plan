import Link from 'next/link';
import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import HomeCalendar from './HomeCalendar';

export default async function HomePage() {
  // Récupérer les recettes pour le sélecteur
  const allRecipes = await db.select({
    id: recipes.id,
    title: recipes.title,
    mealCourse: recipes.mealCourse,
  }).from(recipes).orderBy(recipes.title);

  return (
    <main className="px-3 sm:px-6 py-4 max-w-2xl sm:max-w-4xl mx-auto">
      <div className="text-center py-4 sm:py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">
          Bienvenue sur Meal Plan
        </h1>
      </div>

      {/* Calendrier des repas de la semaine sur la page d'accueil */}
      <HomeCalendar recipes={allRecipes} />

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <Link
          href="/recipes"
          className="block bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow hover:border-blue-300"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Recettes</h2>
          <p className="text-xs sm:text-sm text-gray-600">Consultez et gérez votre catalogue de recettes.</p>
        </Link>
        
        <Link
          href="/ingredients"
          className="block bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow hover:border-green-300"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Ingrédients</h2>
          <p className="text-xs sm:text-sm text-gray-600">Gérez votre dictionnaire d'ingrédients par rayon.</p>
        </Link>
      </div>
    </main>
  );
}
