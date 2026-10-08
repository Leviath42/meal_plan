'use client';

import { useState } from 'react';
import NewIngredientForm from './NewIngredientForm';

// Bouton « + Nouvel ingrédient » (cohérent avec « + Nouvelle recette ») :
// le formulaire de création n'apparaît qu'au clic.
export default function NewIngredientPanel({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent-hover transition-colors whitespace-nowrap"
      >
        {open ? 'Fermer' : '+ Nouvel ingrédient'}
      </button>
      {open && <NewIngredientForm categories={categories} />}
    </div>
  );
}
