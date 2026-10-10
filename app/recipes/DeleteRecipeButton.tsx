'use client';

import { deleteRecipe } from '@/app/actions/recipes';
import { useState, useTransition } from 'react';
import ConfirmDialog from '@/app/components/ConfirmDialog';

export default function DeleteRecipeButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = () => {
    setConfirmOpen(false);
    setError(null);
    startTransition(async () => {
      try {
        await deleteRecipe(id);
      } catch {
        setError('Impossible de supprimer la recette');
      }
    });
  };

  return (
    <div className="flex flex-col items-start">
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="text-sm bg-red-100 text-red-700 rounded px-3 py-1 hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        {pending ? 'Suppression…' : 'Supprimer'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer la recette"
        message={
          <>
            Voulez-vous vraiment supprimer <strong>«&nbsp;{title}&nbsp;»</strong>&nbsp;?
            Les repas planifiés qui l'utilisent seront conservés mais perdront
            leur référence à la recette.
          </>
        }
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
