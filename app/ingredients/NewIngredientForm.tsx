'use client';

import { useActionState } from 'react';
import { createIngredient } from '@/app/actions/ingredients';

export default function NewIngredientForm() {
  const [state, formAction, pending] = useActionState(createIngredient, null);

  return (
    <form action={formAction} className="flex gap-2 mb-8">
      <input name="name" placeholder="Nom" required className="border rounded px-3 py-2 flex-1" />
      {state?.errors?.name && <p className="text-red-600 text-sm">{state.errors.name[0]}</p>}
      <input name="category" placeholder="Rayon" required className="border rounded px-3 py-2 w-36" />
      <input name="defaultUnit" placeholder="Unité" required className="border rounded px-3 py-2 w-24" />
      <button disabled={pending} className="bg-blue-600 text-white rounded px-4">
        {pending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  );
}
