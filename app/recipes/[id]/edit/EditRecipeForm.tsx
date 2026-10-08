'use client';

import { useActionState, useState } from 'react';
import { updateRecipe, deleteRecipe } from '@/app/actions/recipes';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import IngredientsSelector from '../../IngredientsSelector';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
}

interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
  note: string | null;
}

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  prepTime: number;
  cookTime: number;
  defaultServings: number;
  instructions: string;
  tags: string | null;
  source: string | null;
  mealCourse: string | null;
  createdAt: string;
  updatedAt: string;
}

// Helper pour récupérer les valeurs du formulaire depuis le state
function getFieldValue(state: any, fieldName: string, recipe: Recipe, defaultValue: string | number = '') {
  return state?.values?.[fieldName] ?? recipe[fieldName as keyof Recipe] ?? defaultValue;
}

export default function EditRecipeForm({
  recipe,
  availableIngredients,
  existingIngredients,
}: {
  recipe: Recipe;
  availableIngredients: Ingredient[];
  existingIngredients: RecipeIngredient[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateRecipe, null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirm(`Voulez-vous vraiment supprimer la recette "${recipe.title}" ?`)) {
      try {
        setDeleteError(null);
        await deleteRecipe(recipe.id);
        router.push('/recipes');
      } catch {
        setDeleteError('Impossible de supprimer la recette');
      }
    }
  };

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h1 className="text-lg sm:text-xl font-bold truncate">Modifier : {recipe.title}</h1>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleDelete}
              disabled={pending}
              className="bg-red-600 text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              Supprimer
            </button>
            <Link
              href={`/recipes/${recipe.id}`}
              className="bg-gray-200 text-gray-800 rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-300 transition-colors whitespace-nowrap"
            >
              Annuler
            </Link>
          </div>
        </div>

        {deleteError && (
          <p className="text-red-600 text-xs sm:text-sm">{deleteError}</p>
        )}

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="id" value={recipe.id} />

          {/* Titre */}
          <div>
            <label htmlFor="title" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Titre *
            </label>
            <input
              id="title"
              name="title"
              defaultValue={getFieldValue(state, 'title', recipe, '')}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {state?.errors?.title && (
              <p className="text-red-600 text-xs mt-1">{state.errors.title[0]}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={getFieldValue(state, 'description', recipe, '')}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Temps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="prepTime" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Temps de préparation (min) *
              </label>
              <input
                id="prepTime"
                name="prepTime"
                type="number"
                min="0"
                defaultValue={getFieldValue(state, 'prepTime', recipe, 0)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="cookTime" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Temps de cuisson (min) *
              </label>
              <input
                id="cookTime"
                name="cookTime"
                type="number"
                min="0"
                defaultValue={getFieldValue(state, 'cookTime', recipe, 0)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Portions */}
          <div>
            <label htmlFor="defaultServings" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Nombre de portions *
            </label>
            <input
              id="defaultServings"
              name="defaultServings"
              type="number"
              min="1"
              defaultValue={getFieldValue(state, 'defaultServings', recipe, 3)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Ingrédients */}
          <IngredientsSelector
            availableIngredients={availableIngredients}
            existingIngredients={state?.ingredients || existingIngredients}
          />

          {/* Instructions */}
          <div>
            <label htmlFor="instructions" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Étapes de préparation *
            </label>
            <textarea
              id="instructions"
              name="instructions"
              defaultValue={getFieldValue(state, 'instructions', recipe, '')}
              rows={4}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {state?.errors?.instructions && (
              <p className="text-red-600 text-xs mt-1">{state.errors.instructions[0]}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Tags (séparés par des virgules)
            </label>
            <input
              id="tags"
              name="tags"
              defaultValue={getFieldValue(state, 'tags', recipe, '')}
              placeholder="Ex: Végétarien, Rapide, Hiver"
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Source */}
          <div>
            <label htmlFor="source" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Source (URL ou nom du livre)
            </label>
            <input
              id="source"
              name="source"
              defaultValue={getFieldValue(state, 'source', recipe, '')}
              placeholder="Ex: https://marmiton.org/... ou 'Livre de cuisine de Mamie'"
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Type de plat */}
          <div>
            <label htmlFor="mealCourse" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Type de plat
            </label>
            <select
              id="mealCourse"
              name="mealCourse"
              defaultValue={getFieldValue(state, 'mealCourse', recipe, '')}
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">-- Sélectionner --</option>
              <option value="apéritif">Apéritif</option>
              <option value="entrée">Entrée</option>
              <option value="plat">Plat principal</option>
              <option value="accompagnement">Accompagnement</option>
              <option value="dessert">Dessert</option>
              <option value="boisson">Boisson</option>
            </select>
          </div>

          {/* Bouton de soumission */}
          <div className="flex gap-3 pt-4">
            <button
              disabled={pending}
              className="bg-accent text-white rounded px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Mise à jour…' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
