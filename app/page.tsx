import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Meal Plan</h1>
        <p className="text-xl text-gray-600 mb-8">
          Application de planification des repas et de gestion de recettes
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/recipes"
            className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow hover:border-blue-300"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Mes recettes</h2>
            <p className="text-gray-600">Consultez et gérez votre catalogue de recettes.</p>
          </Link>
          
          <Link
            href="/ingredients"
            className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow hover:border-green-300"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Ingrédients</h2>
            <p className="text-gray-600">Gérez votre dictionnaire d'ingrédients par rayon.</p>
          </Link>
        </div>

        <div className="mt-6">
          <Link
            href="/recipes/new"
            className="inline-block bg-blue-600 text-white rounded-lg px-6 py-3 hover:bg-blue-700 transition-colors"
          >
            + Ajouter une nouvelle recette
          </Link>
        </div>
      </div>
    </main>
  );
}
