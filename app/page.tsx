import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="text-center py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-3">Meal Plan</h1>
        <p className="text-sm sm:text-lg text-gray-600 mb-6">
          Application de planification des repas et de gestion de recettes
        </p>
        
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <Link
            href="/recipes"
            className="block bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow hover:border-blue-300"
          >
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Mes recettes</h2>
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

        <div className="mt-4 sm:mt-6">
          <Link
            href="/recipes/new"
            className="inline-block bg-blue-600 text-white rounded-lg px-4 sm:px-6 py-2 sm:py-3 hover:bg-blue-700 transition-colors text-xs sm:text-sm"
          >
            + Ajouter une nouvelle recette
          </Link>
        </div>
      </div>
    </main>
  );
}
