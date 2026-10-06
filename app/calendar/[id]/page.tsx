import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { mealPlans, recipes, ingredients, recipeIngredients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Page pour afficher les détails d'un repas planifié
export default async function MealPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Récupérer le repas planifié
  const [mealPlan] = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.id, id))
    .limit(1);
  
  if (!mealPlan) {
    return notFound();
  }

  // Récupérer la recette associée si elle existe
  let recipe = null;
  let recipeIngredientsList: any[] = [];
  
  if (mealPlan.recipeId) {
    [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, mealPlan.recipeId))
      .limit(1);
    
    if (recipe) {
      // Récupérer les ingrédients de la recette
      recipeIngredientsList = await db
        .select({
          id: ingredients.id,
          name: ingredients.name,
          quantity: recipeIngredients.quantity,
          unit: recipeIngredients.unit,
          category: ingredients.category,
        })
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, recipe.id))
        .leftJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id));
    }
  }

  // Map des types de repas en français
  const mealTypeLabels: Record<string, string> = {
    breakfast: 'Petit-déjeuner',
    lunch: 'Déjeuner',
    snack: 'Goûter',
    dinner: 'Dîner',
  };

  // Formater la date
  const date = new Date(mealPlan.date);
  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <main className="px-3 sm:px-6 py-4 max-w-4xl mx-auto">
      <div className="space-y-4">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Détails du repas planifié
          </h1>
          <Link
            href="/calendar"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
          >
            ← Retour au calendrier
          </Link>
        </div>

        {/* Carte des informations principales */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Informations générales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Date</p>
              <p className="text-gray-800">{formattedDate}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Type de repas</p>
              <p className="text-gray-800">
                {mealTypeLabels[mealPlan.mealType] || mealPlan.mealType}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Nombre de couverts</p>
              <p className="text-gray-800">{mealPlan.servings}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Type de plat</p>
              <p className="text-gray-800">
                {mealPlan.mealCourse || 'Non spécifié'}
              </p>
            </div>
          </div>

          {/* Note personnalisée */}
          {mealPlan.customNote && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-1">Note personnalisée</p>
              <p className="text-gray-800">{mealPlan.customNote}</p>
            </div>
          )}
        </div>

        {/* Carte de la recette associée */}
        {recipe && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Recette associée
            </h2>
            
            <div className="mb-4">
              <h3 className="text-xl font-medium text-blue-600">{recipe.title}</h3>
              <p className="text-sm text-gray-500 mt-1">ID: {recipe.id}</p>
            </div>

            {/* Description de la recette */}
            {recipe.description && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-700">{recipe.description}</p>
              </div>
            )}

            {/* Temps de préparation et cuisson */}
            {(recipe.prepTime || recipe.cookTime) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {recipe.prepTime > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Temps de préparation</p>
                    <p className="text-gray-800">{recipe.prepTime} min</p>
                  </div>
                )}
                {recipe.cookTime > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Temps de cuisson</p>
                    <p className="text-gray-800">{recipe.cookTime} min</p>
                  </div>
                )}
              </div>
            )}

            {/* Ingrédients de la recette */}
            {recipeIngredientsList.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Ingrédients</h4>
                <div className="space-y-2">
                  {recipeIngredientsList.map((ingredient, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600 w-20">{ingredient.category || 'Divers'}</span>
                      <span className="flex-1 text-gray-800">{ingredient.name}</span>
                      <span className="text-sm text-gray-500">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lien vers la recette complète */}
            <div className="mt-4">
              <Link
                href={`/recipes/${recipe.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Voir la recette complète →
              </Link>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/calendar/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Modifier le repas planifié
            </Link>
            
            <form action={`/calendar/${id}/delete`} method="POST">
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                onClick={(e) => {
                  if (!confirm('Êtes-vous sûr de vouloir supprimer ce repas planifié ?')) {
                    e.preventDefault();
                  }
                }}
              >
                Supprimer
              </button>
            </form>
            
            <Link
              href="/calendar"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
            >
              Retour au calendrier
            </Link>
          </div>
        </div>

        {/* Metadonnées */}
        <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <span className="font-medium">Créé le:</span> {mealPlan.createdAt || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Mis à jour le:</span> {mealPlan.updatedAt || 'N/A'}
            </div>
            <div>
              <span className="font-medium">ID:</span> {mealPlan.id}
            </div>
            <div>
              <span className="font-medium">Recette ID:</span> {mealPlan.recipeId || 'Aucune'}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
