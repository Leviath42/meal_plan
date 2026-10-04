'use client';

import { useState, useTransition } from 'react';
import { updateIngredient, deleteIngredient } from '@/app/actions/ingredients';

export default function IngredientRow({ id, name, category, defaultUnit }: {
  id: string; name: string; category: string; defaultUnit: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <li className="py-2">
        <form action={async (fd) => {
          const res = await updateIngredient(id, fd);
          if (res?.errors) {
            setError(Object.values(res.errors).flat().join(' '));
          } else {
            setEditing(false);
            setError(null);
          }
        }} className="flex gap-2">
          <input name="name" defaultValue={name} className="border rounded px-3 py-2 flex-1" />
          <input name="category" defaultValue={category} className="border rounded px-3 py-2 w-36" />
          <input name="defaultUnit" defaultValue={defaultUnit} className="border rounded px-3 py-2 w-24" />
          <button type="submit" className="bg-green-600 text-white rounded px-3">OK</button>
          <button type="button" onClick={() => { setEditing(false); setError(null); }} className="rounded px-3">Annuler</button>
        </form>
        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2">
      <span>{name} <span className="text-gray-400 text-sm">({category}, {defaultUnit})</span></span>
      <span className="flex gap-2">
        <button onClick={() => setEditing(true)} className="text-blue-600 underline">Modifier</button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`Supprimer « ${name} » ?`)) {
              startTransition(async () => {
                const res = await deleteIngredient(id);
                if (res?.error) alert(res.error);
              });
            }
          }}
          className="text-red-600 underline"
        >
          Supprimer
        </button>
      </span>
    </li>
  );
}
