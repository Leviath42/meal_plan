'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { previewRecipeFromUrl, confirmRecipeImport } from '@/app/actions/import-recipe';
import Link from 'next/link';

export function ImportRecipeForm() {
  const router = useRouter();
  const [previewState, previewAction, previewPending] = useActionState(previewRecipeFromUrl, null);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmRecipeImport, null);
  const [url, setUrl] = useState('');

  // La confirmation a réussi : on redirige vers la recette créée.
  // Dans un effet : router.push pendant le rendu lève une exception React,
  // qui remonte dans l'error boundary et affiche « This page couldn't load »
  const recipeId = confirmState?.recipeId;
  useEffect(() => {
    if (recipeId) {
      router.push(`/recipes/${recipeId}`);
    }
  }, [recipeId, router]);

  const preview = previewState?.preview;

  return (
    <div className="space-y-4">
      {/* Étape 1 : URL */}
      <form action={previewAction} className="flex gap-2">
        <input
          type="url"
          name="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.marmiton.org/recettes/…"
          className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={previewPending}
          className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {previewPending ? 'Analyse…' : 'Analyser'}
        </button>
      </form>

      {previewState?.error && (
        <p role="alert" className="text-sm text-red-600">{previewState.error}</p>
      )}

      {/* Étape 2 : prévisualisation + confirmation */}
      {preview && (
        <form action={confirmAction} className="rounded border border-gray-300 p-4 space-y-3 bg-gray-50">
          <p className="text-xs text-gray-500">Source : {preview.host}</p>
          <input type="hidden" name="source" value={preview.source} />
          <input type="hidden" name="ingredientsJson" value={JSON.stringify(preview.ingredients)} />

          <label className="block text-xs font-medium">
            Titre
            <input name="title" defaultValue={preview.title} required maxLength={150}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm" />
          </label>

          <label className="block text-xs font-medium">
            Description
            <textarea name="description" defaultValue={preview.description ?? ''} rows={2} maxLength={2000}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm" />
          </label>

          <div className="grid grid-cols-3 gap-2">
            <label className="block text-xs font-medium">Prépa (min)
              <input name="prepTime" type="number" min={0} defaultValue={preview.prepTime}
                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm" />
            </label>
            <label className="block text-xs font-medium">Cuisson (min)
              <input name="cookTime" type="number" min={0} defaultValue={preview.cookTime}
                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm" />
            </label>
            <label className="block text-xs font-medium">Couverts
              <input name="defaultServings" type="number" min={1} defaultValue={preview.defaultServings}
                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm" />
            </label>
          </div>

          <label className="block text-xs font-medium">
            Étapes
            <textarea name="instructions" defaultValue={preview.instructions} rows={5} maxLength={20000}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm" />
          </label>

          <label className="block text-xs font-medium">
            Tags (séparés par des virgules)
            <input name="tags" defaultValue={preview.tags ?? ''} maxLength={300}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm" />
          </label>

          {preview.ingredients.length > 0 && (
            <div className="text-xs">
              <p className="font-medium mb-1">Ingrédients extraits ({preview.ingredients.length}) :</p>
              <ul className="list-disc pl-5 text-gray-600">
                {preview.ingredients.map((ing, i) => (
                  <li key={i}>
                    {ing.quantity ? `${ing.quantity} ${ing.unit ?? ''} ` : ''}{ing.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {confirmState?.error && (
            <p role="alert" className="text-sm text-red-600">{confirmState.error}</p>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={confirmPending}
              className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent-hover transition-colors disabled:opacity-50">
              {confirmPending ? 'Import…' : 'Importer cette recette'}
            </button>
            <Link href="/recipes" className="rounded border border-gray-300 px-3 py-2 text-xs sm:text-sm hover:bg-gray-100 transition-colors">
              Annuler
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
