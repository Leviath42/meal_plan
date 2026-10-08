'use client';

import { useActionState, useState } from 'react';
import { createIngredient } from '@/app/actions/ingredients';
import CategorySelect from '@/app/components/CategorySelect';

// Helper pour récupérer les valeurs du formulaire depuis le state
function getValue(state: any, fieldName: string, defaultValue: string = '') {
  return state?.values?.[fieldName] ?? defaultValue;
}

// Formulaire de création d'ingrédient : rayon sélectionné dans une liste
// existante + possibilité de créer un nouveau rayon à la volée.
export default function NewIngredientForm({ categories }: { categories: string[] }) {
  const [state, formAction, pending] = useActionState(createIngredient, null);
  const [category, setCategory] = useState(state?.values?.category ?? '');

  const inputClass =
    'border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white text-gray-800';

  return (
    <form action={formAction} className="flex flex-col sm:flex-row gap-2 mb-6">
      <div className="flex-1">
        <input
          name="name"
          placeholder="Nom"
          required
          defaultValue={getValue(state, 'name')}
          className={`w-full ${inputClass}`}
        />
        {state?.errors?.name && <p className="text-red-600 text-xs mt-1">{state.errors.name[0]}</p>}
      </div>
      <div className="flex-1">
        <CategorySelect
          id="new-ingredient-category"
          value={category}
          onChange={setCategory}
          categories={categories}
          required
          className={`w-full ${inputClass}`}
        />
        {/* La valeur est portée par le champ caché : le composant gère
            indifféremment la sélection d'un rayon existant ou la saisie
            d'un nouveau. */}
        <input type="hidden" name="category" value={category} />
        {state?.errors?.category && (
          <p className="text-red-600 text-xs mt-1">{state.errors.category[0]}</p>
        )}
      </div>
      <input
        name="defaultUnit"
        placeholder="Unité"
        required
        defaultValue={getValue(state, 'defaultUnit')}
        className={`${inputClass} w-full sm:w-24`}
      />
      <button
        disabled={pending}
        className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {pending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  );
}
