'use client';

import { deleteRecipe } from '@/app/actions/recipes';
import { useState, useTransition } from 'react';

export default function DeleteRecipeButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (confirm(`Voulez-vous vraiment supprimer "${title}" ?`)) {
      setError(null);
      startTransition(async () => {
        try {
          await deleteRecipe(id);
        } catch {
          setError('Impossible de supprimer la recette');
        }
      });
    }
  };

  return (
    <div className="flex flex-col items-start">
      <button
        onClick={handleDelete}
        disabled={pending}
        className="text-sm bg-red-100 text-red-700 rounded px-3 py-1 hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        {pending ? 'Suppression…' : 'Supprimer'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
