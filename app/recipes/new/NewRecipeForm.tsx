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

export function NewRecipeForm({ availableIngredients }: { availableIngredients: Ingredient[] }) {
  const [state, formAction, pending] = useActionState(createRecipe, null);

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nouvelle recette</h1>
        <Link href="/recipes" className="bg-gray-200 text-gray-800 rounded px-4 py-2 hover:bg-gray-300 transition-colors">
          Annuler
        </Link>
      </div>

      <form action={formAction} className="space-y-6">
        {/* Titre */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Titre *
          </label>
          <input
            id="title"
            name="title"
            placeholder="Ex: Lasagnes Maison"
            required
            className="w-full border rounded px-3 py-2"
          />
          {state?.errors?.title && (
            <p className="text-red-600 text-sm mt-1">{state.errors.title[0]}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="Ex: La recette de Mamie"
            rows={2}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Temps */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700 mb-1">
              Temps de préparation (min) *
            </label>
            <input
              id="prepTime"
              name="prepTime"
              type="number"
              min="0"
              defaultValue="0"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="cookTime" className="block text-sm font-medium text-gray-700 mb-1">
              Temps de cuisson (min) *
            </label>
            <input
              id="cookTime"
              name="cookTime"
              type="number"
              min="0"
              defaultValue="0"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Portions */}
        <div>
          <label htmlFor="defaultServings" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de portions *
          </label>
          <input
            id="defaultServings"
            name="defaultServings"
            type="number"
            min="1"
            defaultValue="3"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Ingrédients */}
        <IngredientsSelector availableIngredients={availableIngredients} />

        {/* Instructions */}
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
            Étapes de préparation *
          </label>
          <textarea
            id="instructions"
            name="instructions"
            placeholder="Ex: 1. Faire revenir les oignons..."
            rows={6}
            required
            className="w-full border rounded px-3 py-2"
          />
          {state?.errors?.instructions && (
            <p className="text-red-600 text-sm mt-1">{state.errors.instructions[0]}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags (séparés par des virgules)
          </label>
          <input
            id="tags"
            name="tags"
            placeholder="Ex: Végétarien, Rapide, Hiver"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Source */}
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
            Source (URL ou nom du livre)
          </label>
          <input
            id="source"
            name="source"
            placeholder="Ex: https://marmiton.org/... ou 'Livre de cuisine de Mamie'"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Erreurs générales */}
        {state?.errors?.ingredients && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{state.errors.ingredients[0]}</p>
          </div>
        )}

        {/* Bouton de soumission */}
        <div className="flex gap-4 pt-4">
          <button
            disabled={pending}
            className="bg-blue-600 text-white rounded px-6 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Création…' : 'Créer la recette'}
          </button>
        </div>
      </form>
    </main>
  );
}
