import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { mealPlans, recipes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { updateMealPlan, getMealPlanById } from '@/app/actions/meal-plan';

// Page pour modifier un repas planifié
export default async function EditMealPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Récupérer le repas planifié
  const mealPlan = await getMealPlanById(id);
  
  if (!mealPlan) {
    return notFound();
  }

  // Récupérer toutes les recettes pour le sélecteur
  const allRecipes = await db.select({
    id: recipes.id,
    title: recipes.title,
  }).from(recipes).orderBy(recipes.title);

  // Map des types de repas en français
  const mealTypeOptions: { value: string; label: string }[] = [
    { value: 'breakfast', label: 'Petit-déjeuner' },
    { value: 'lunch', label: 'Déjeuner' },
    { value: 'snack', label: 'Goûter' },
    { value: 'dinner', label: 'Dîner' },
  ];

  // Formater la date pour le champ date
  const formattedDate = mealPlan.date;

  // Trouver la recette sélectionnée
  const selectedRecipe = allRecipes.find(r => r.id === mealPlan.recipeId);

  // Fonction pour gérer la soumission
  async function handleUpdate(formData: FormData) {
    'use server';
    
    const result = await updateMealPlan(id, null, formData);
    
    if (result.errors) {
      console.error('Erreurs:', result.errors);
      return;
    }
    
    redirect(`/calendar/${id}`);
  }

  return (
    <main className="px-3 sm:px-6 py-4 max-w-4xl mx-auto">
      <div className="space-y-4">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Modifier le repas planifié
          </h1>
          <Link
            href={`/calendar/${id}`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
          >
            ← Retour
          </Link>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form action={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  defaultValue={formattedDate}
                  required
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* Type de repas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de repas *
                </label>
                <select
                  name="mealType"
                  defaultValue={mealPlan.mealType}
                  required
                  className="w-full p-2 border rounded"
                >
                  {mealTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recette */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recette (optionnel)
                </label>
                <select
                  name="recipeId"
                  defaultValue={mealPlan.recipeId || ''}
                  className="w-full p-2 border rounded"
                >
                  <option value="">-- Aucune recette --</option>
                  {allRecipes.map(recipe => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note personnalisée */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note personnalisée (optionnel)
                </label>
                <input
                  type="text"
                  name="customNote"
                  defaultValue={mealPlan.customNote || ''}
                  placeholder="Ex: Soirée Pizza, Barbecue..."
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* Nombre de couverts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de couverts *
                </label>
                <input
                  type="number"
                  name="servings"
                  defaultValue={mealPlan.servings}
                  min="1"
                  max="20"
                  required
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* Type de plat */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de plat (optionnel)
                </label>
                <input
                  type="text"
                  name="mealCourse"
                  defaultValue={mealPlan.mealCourse || ''}
                  placeholder="Ex: Entrée, Plat, Dessert"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Enregistrer les modifications
              </button>
              
              <Link
                href={`/calendar/${id}`}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Annuler
              </Link>
              
              <Link
                href="/calendar"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                Retour au calendrier
              </Link>
            </div>
          </form>
        </div>

        {/* Informations actuelles */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-2">Informations actuelles</h3>
          <div className="text-sm text-gray-600">
            <p><strong>ID:</strong> {mealPlan.id}</p>
            <p><strong>Créé le:</strong> {mealPlan.createdAt || 'N/A'}</p>
            <p><strong>Mis à jour le:</strong> {mealPlan.updatedAt || 'N/A'}</p>
            {selectedRecipe && <p><strong>Recette:</strong> {selectedRecipe.title}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
