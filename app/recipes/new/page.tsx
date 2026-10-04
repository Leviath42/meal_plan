'use client';

import { useActionState } from 'react';
import { createRecipe } from '@/app/actions/recipes';

export default function NewRecipeForm() {
  const [state, formAction, pending] = useActionState(createRecipe, null);

  return (
    <form action={formAction} className="space-y-3">
      <input name="title" placeholder="Titre" required className="w-full border rounded px-3 py-2" />
      {state?.errors?.title && (
        <p className="text-red-600 text-sm">{state.errors.title[0]}</p>
      )}
      {/* ... autres champs ... */}
      <input name="ingredients" type="hidden" value='[]' />
      <button disabled={pending} className="bg-blue-600 text-white rounded px-4 py-2">
        {pending ? 'Création…' : 'Créer'}
      </button>
    </form>
  );
}