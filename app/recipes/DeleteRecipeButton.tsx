'use client';

import { deleteRecipe } from '@/app/actions/recipes';
import { useTransition } from 'react';

export default function DeleteRecipeButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`Voulez-vous vraiment supprimer "${title}" ?`)) {
      startTransition(async () => {
        await deleteRecipe(id);
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-sm bg-red-100 text-red-700 rounded px-3 py-1 hover:bg-red-200 transition-colors disabled:opacity-50"
    >
      {pending ? 'Suppression…' : 'Supprimer'}
    </button>
  );
}
