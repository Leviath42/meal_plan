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
    <main className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{recipe.title}</h1>
        <div className="flex gap-2">
          <Link
            href={`/recipes/${id}/edit`}
            className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition-colors"
          >
            Modifier
          </Link>
          <Link
            href="/recipes"
            className="bg-gray-200 text-gray-800 rounded px-4 py-2 hover:bg-gray-300 transition-colors"
          >
            Retour
          </Link>
        </div>
      </div>

      {recipe.description && (
        <p className="text-gray-600 mb-6">{recipe.description}</p>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Préparation</p>
          <p className="text-2xl font-bold text-blue-600">{recipe.prepTime} min</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Cuisson</p>
          <p className="text-2xl font-bold text-orange-600">{recipe.cookTime} min</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-green-600">{totalTime} min</p>
        </div>
      </div>

      {recipe.tags && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {recipe.tags.split(',').map((tag) => (
              <span
                key={tag.trim()}
                className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Ingrédients ({recipe.defaultServings} personnes)</h2>
        {recipeIngs.length > 0 ? (
          <ul className="divide-y border rounded-lg">
            {recipeIngs.map((item) => (
              <li key={item.id} className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.note && (
                      <p className="text-sm text-gray-500">{item.note}</p>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {item.quantity} {item.unit}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Aucun ingrédient pour cette recette.</p>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Étapes de préparation</h2>
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{recipe.instructions}</p>
        </div>
      </div>

      {recipe.source && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Source</h2>
          <p className="text-gray-600">
            {recipe.source.startsWith('http') ? (
              <a
                href={recipe.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {recipe.source}
              </a>
            ) : (
              recipe.source
            )}
          </p>
        </div>
      )}

      <div className="text-sm text-gray-500">
        <p>
          Créé le : {new Date(recipe.createdAt).toLocaleDateString('fr-FR')}
        </p>
        <p>
          Modifié le : {new Date(recipe.updatedAt).toLocaleDateString('fr-FR')}
        </p>
      </div>
    </main>
  );
}
