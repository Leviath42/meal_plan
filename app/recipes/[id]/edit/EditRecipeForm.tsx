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
  createdAt: string;
  updatedAt: string;
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

  const handleDelete = async () => {
    if (confirm(`Voulez-vous vraiment supprimer la recette "${recipe.title}" ?`)) {
      await deleteRecipe(recipe.id);
      router.push('/recipes');
    }
  };

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Modifier : {recipe.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={pending}
            className="bg-red-600 text-white rounded px-4 py-2 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Supprimer
          </button>
          <Link
            href={`/recipes/${recipe.id}`}
            className="bg-gray-200 text-gray-800 rounded px-4 py-2 hover:bg-gray-300 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </div>

      <form action={formAction} className="space-y-6" noValidate>
        <input type="hidden" name="id" value={recipe.id} />

        {/* Titre */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Titre *
          </label>
          <input
            id="title"
            name="title"
            defaultValue={recipe.title}
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
            defaultValue={recipe.description || ''}
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
              defaultValue={recipe.prepTime}
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
              defaultValue={recipe.cookTime}
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
            defaultValue={recipe.defaultServings}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Ingrédients */}
        <IngredientsSelector
          availableIngredients={availableIngredients}
          existingIngredients={existingIngredients}
        />

        {/* Instructions */}
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
            Étapes de préparation *
          </label>
          <textarea
            id="instructions"
            name="instructions"
            defaultValue={recipe.instructions}
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
            defaultValue={recipe.tags || ''}
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
            defaultValue={recipe.source || ''}
            placeholder="Ex: https://marmiton.org/... ou 'Livre de cuisine de Mamie'"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Bouton de soumission */}
        <div className="flex gap-4 pt-4">
          <button
            disabled={pending}
            className="bg-blue-600 text-white rounded px-6 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Mise à jour…' : 'Mettre à jour'}
          </button>
        </div>
      </form>
    </main>
  );
}
