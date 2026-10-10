import Link from 'next/link';
import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import HomeCalendar from './HomeCalendar';
import { getAppSettings } from '@/app/actions/settings';

export default async function HomePage() {
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
    <main className="px-3 sm:px-6 py-2 sm:py-3 max-w-2xl sm:max-w-4xl mx-auto">
      <h1 className="sr-only">Planning des repas</h1>
      {/* Calendrier des repas de la semaine sur la page d'accueil */}
      <HomeCalendar recipes={allRecipes} defaultServings={settings.defaultServings} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link
          href="/recipes"
          className="block bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow hover:border-accent"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Recettes</h2>
          <p className="text-xs sm:text-sm text-gray-600">Consultez et gérez votre catalogue de recettes.</p>
        </Link>

        <Link
          href="/ingredients"
          className="block bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow hover:border-green-300"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Ingrédients</h2>
          <p className="text-xs sm:text-sm text-gray-600">Gérez votre dictionnaire d'ingrédients par rayon.</p>
        </Link>

        <Link
          href="/shopping-list"
          className="block bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow hover:border-blue-300"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Courses</h2>
          <p className="text-xs sm:text-sm text-gray-600">Générez et cochez votre liste de courses.</p>
        </Link>
      </div>
    </main>
  );
}
