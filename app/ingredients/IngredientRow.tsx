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
        }} className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => e.preventDefault()}>
          <input name="name" defaultValue={name} className="border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="category" defaultValue={category} className="border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="defaultUnit" defaultValue={defaultUnit} className="border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2 flex-shrink-0">
            <button type="submit" className="bg-green-600 text-white rounded px-3 py-1 text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap">OK</button>
            <button type="button" onClick={() => { setEditing(false); setError(null); }} className="rounded px-3 py-1 text-xs sm:text-sm text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap">Annuler</button>
          </div>
        </form>
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-2">
      <span className="text-xs sm:text-sm">
        {name} <span className="text-gray-400 text-xs">({category}, {defaultUnit})</span>
      </span>
      <span className="flex gap-2 flex-shrink-0">
        <button onClick={() => setEditing(true)} className="text-blue-600 underline text-xs sm:text-sm hover:text-blue-800 transition-colors whitespace-nowrap">Modifier</button>
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
          className="text-red-600 underline text-xs sm:text-sm hover:text-red-800 transition-colors whitespace-nowrap"
        >
          Supprimer
        </button>
      </span>
    </li>
  );
}
