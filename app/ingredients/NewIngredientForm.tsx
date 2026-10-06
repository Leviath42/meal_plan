'use client';

import { useActionState } from 'react';
import { createIngredient } from '@/app/actions/ingredients';

// Helper pour récupérer les valeurs du formulaire depuis le state
function getValue(state: any, fieldName: string, defaultValue: string = '') {
  return state?.values?.[fieldName] ?? defaultValue;
}

export default function NewIngredientForm() {
  const [state, formAction, pending] = useActionState(createIngredient, null);

  return (
    <form action={formAction} className="flex flex-col sm:flex-row gap-2 mb-6">
      <div className="flex-1">
        <input 
          name="name" 
          placeholder="Nom" 
          required 
          defaultValue={getValue(state, 'name')}
          className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent" 
        />
        {state?.errors?.name && <p className="text-red-600 text-xs mt-1">{state.errors.name[0]}</p>}
      </div>
      <input 
        name="category" 
        placeholder="Rayon" 
        required 
        defaultValue={getValue(state, 'category')}
        className="border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-accent" 
      />
      <input 
        name="defaultUnit" 
        placeholder="Unité" 
        required 
        defaultValue={getValue(state, 'defaultUnit')}
        className="border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-accent" 
      />
      <button disabled={pending} className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 whitespace-nowrap">
        {pending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  );
}
