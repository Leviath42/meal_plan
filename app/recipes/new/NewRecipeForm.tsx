'use client';

import { useActionState } from 'react';
import { createRecipe } from '@/app/actions/recipes';
import Link from 'next/link';
import IngredientsSelector from '../IngredientsSelector';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
}

// Helper pour récupérer les valeurs du formulaire depuis le state
function getFieldValue(state: any, fieldName: string, defaultValue: string | number = '') {
  return state?.values?.[fieldName] ?? defaultValue;
}

export function NewRecipeForm({
  availableIngredients,
  categories = [],
}: {
  availableIngredients: Ingredient[];
  categories?: string[];
}) {
  const [state, formAction, pending] = useActionState(createRecipe, null);

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h1 className="text-lg sm:text-xl font-bold">Nouvelle recette</h1>
          <Link href="/recipes" className="bg-gray-200 text-gray-800 rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-300 transition-colors whitespace-nowrap">
            Annuler
          </Link>
        </div>

        <form action={formAction} className="space-y-4" noValidate>
          {/* Titre */}
          <div>
            <label htmlFor="title" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Titre *
            </label>
            <input
              id="title"
              name="title"
              placeholder="Ex: Lasagnes Maison"
              required
              defaultValue={getFieldValue(state, 'title', '')}
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
              placeholder="Ex: La recette de Mamie"
              rows={2}
              defaultValue={getFieldValue(state, 'description', '')}
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
              defaultValue={getFieldValue(state, 'mealCourse', '')}
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
            {state?.errors?.mealCourse && (
              <p className="text-red-600 text-xs mt-1">{state.errors.mealCourse[0]}</p>
            )}
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
                defaultValue={getFieldValue(state, 'prepTime', 0)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            {state?.errors?.prepTime && (
              <p className="text-red-600 text-xs mt-1">{state.errors.prepTime[0]}</p>
            )}
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
                defaultValue={getFieldValue(state, 'cookTime', 0)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            {state?.errors?.cookTime && (
              <p className="text-red-600 text-xs mt-1">{state.errors.cookTime[0]}</p>
            )}
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
              defaultValue={getFieldValue(state, 'defaultServings', 4)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {state?.errors?.defaultServings && (
              <p className="text-red-600 text-xs mt-1">{state.errors.defaultServings[0]}</p>
            )}
          </div>

          {/* Ingrédients */}
          <IngredientsSelector 
            availableIngredients={availableIngredients} 
            existingIngredients={state?.ingredients || []}
            categories={categories}
          />

          {/* Instructions */}
          <div>
            <label htmlFor="instructions" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Étapes de préparation *
            </label>
            <textarea
              id="instructions"
              name="instructions"
              placeholder="Ex: 1. Faire revenir les oignons..."
              rows={4}
              required
              defaultValue={getFieldValue(state, 'instructions', '')}
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
              placeholder="Ex: Végétarien, Rapide, Hiver"
              defaultValue={getFieldValue(state, 'tags', '')}
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
              placeholder="Ex: https://marmiton.org/... ou 'Livre de cuisine de Mamie'"
              defaultValue={getFieldValue(state, 'source', '')}
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Erreurs générales */}
          {state?.errors?.ingredients && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 text-xs sm:text-sm">{state.errors.ingredients[0]}</p>
            </div>
          )}

          {/* Bouton de soumission */}
          <div className="flex gap-3 pt-4">
            <button
              disabled={pending}
              className="bg-accent text-white rounded px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Création…' : 'Créer la recette'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
