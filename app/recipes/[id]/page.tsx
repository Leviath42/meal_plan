import { db } from '@/lib/db';
import { recipes, recipeIngredients, ingredients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [recipe] = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, id));

  if (!recipe) {
    notFound();
  }

  const recipeIngs = await db
    .select({
      id: recipeIngredients.id,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
      note: recipeIngredients.note,
      ingredientId: recipeIngredients.ingredientId,
      name: ingredients.name,
      category: ingredients.category,
      defaultUnit: ingredients.defaultUnit,
    })
    .from(recipeIngredients)
    .leftJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, id));

  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h1 className="text-lg sm:text-xl font-bold truncate">{recipe.title}</h1>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/recipes/${id}/edit`}
              className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent-hover transition-colors whitespace-nowrap"
            >
              Modifier
            </Link>
            <Link
              href="/recipes"
              className="bg-gray-200 text-gray-800 rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-300 transition-colors whitespace-nowrap"
            >
              Retour
            </Link>
          </div>
        </div>

        {recipe.description && (
          <p className="text-xs sm:text-sm text-gray-600 mb-4">{recipe.description}</p>
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
          <div className="bg-gray-50 rounded p-2 sm:p-3 text-center">
            <p className="text-xs text-gray-500 whitespace-nowrap">Préparation</p>
            <p className="text-lg sm:text-xl font-bold text-accent">{recipe.prepTime} min</p>
          </div>
          <div className="bg-gray-50 rounded p-2 sm:p-3 text-center">
            <p className="text-xs text-gray-500 whitespace-nowrap">Cuisson</p>
            <p className="text-lg sm:text-xl font-bold text-orange-600">{recipe.cookTime} min</p>
          </div>
          <div className="bg-gray-50 rounded p-2 sm:p-3 text-center">
            <p className="text-xs text-gray-500 whitespace-nowrap">Total</p>
            <p className="text-lg sm:text-xl font-bold text-green-600">{totalTime} min</p>
          </div>
        </div>

        {recipe.tags && recipe.tags.trim() !== '' && (
          <div className="mb-4">
            <h2 className="text-xs sm:text-sm font-semibold mb-2">Tags</h2>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {recipe.tags.split(',').map((tag) => (
                <span
                  key={tag.trim()}
                  className="bg-gray-100 text-gray-700 rounded-full px-2 sm:px-3 py-1 text-xs"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <h2 className="text-xs sm:text-sm font-semibold mb-2">Ingrédients ({recipe.defaultServings} personnes)</h2>
          {recipeIngs.length > 0 ? (
            <ul className="divide-y border border-gray-200 rounded">
              {recipeIngs.map((item) => (
                <li key={item.id} className="p-2 sm:p-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{item.name}</p>
                      {item.note && (
                        <p className="text-xs text-gray-500">{item.note}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs sm:text-sm text-gray-500">Aucun ingrédient pour cette recette.</p>
          )}
        </div>

        <div className="mb-4">
          <h2 className="text-xs sm:text-sm font-semibold mb-2">Étapes de préparation</h2>
          <div className="prose max-w-none text-xs sm:text-sm">
            <p className="whitespace-pre-wrap">{recipe.instructions}</p>
          </div>
        </div>

        {recipe.source && (
          <div className="mb-4">
            <h2 className="text-xs sm:text-sm font-semibold mb-2">Source</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {recipe.source.startsWith('http') ? (
                <a
                  href={recipe.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  {recipe.source}
                </a>
              ) : (
                recipe.source
              )}
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>
            Créé le : {new Date(recipe.createdAt).toLocaleDateString('fr-FR')}
          </p>
          <p>
            Modifié le : {new Date(recipe.updatedAt).toLocaleDateString('fr-FR')}
          </p>
          {recipe.lastServedAt && (
            <p>
              Dernier repas planifié :{' '}
              {new Date(recipe.lastServedAt + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
