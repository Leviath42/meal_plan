'use client';

import { useActionState } from 'react';
import { createIngredient } from '@/app/actions/ingredients';

export default function NewIngredientForm() {
  const [state, formAction, pending] = useActionState(createIngredient, null);

  return (
    <form action={formAction} className="flex flex-col sm:flex-row gap-2 mb-6">
      <div className="flex-1">
        <input name="name" placeholder="Nom" required className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {state?.errors?.name && <p className="text-red-600 text-xs mt-1">{state.errors.name[0]}</p>}
      </div>
      <input name="category" placeholder="Rayon" required className="border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input name="defaultUnit" placeholder="Unité" required className="border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button disabled={pending} className="bg-blue-600 text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap">
        {pending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  );
}
