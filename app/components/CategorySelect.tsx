'use client';

import { useState } from 'react';
import SearchSelect from '@/app/components/SearchSelect';

// Sélecteur de rayon avec création à la volée : liste des rayons existants
// + option « + Nouveau rayon… » qui bascule sur un champ texte libre.
// La valeur reste contrôlée par le parent (chaîne simple).
export default function CategorySelect({
  id,
  value,
  onChange,
  categories,
  required = false,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  required?: boolean;
  className?: string;
}) {
  const [creatingNew, setCreatingNew] = useState(false);
  // Valeur en cours de création non confirmée (pas encore dans la liste)
  const isNewValue = value !== '' && !categories.includes(value);

  if (creatingNew || isNewValue) {
    return (
      <div className="flex gap-2 flex-1">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nom du nouveau rayon (ex: Surgelés)"
          required={required}
          className={className}
        />
        {!isNewValue && (
          <button
            type="button"
            onClick={() => {
              setCreatingNew(false);
              onChange('');
            }}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            Retour
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-1">
      <SearchSelect
        id={id}
        items={categories.map((category) => ({ value: category, label: category }))}
        value={value}
        onChange={onChange}
        placeholder="Recherchez un rayon…"
        emptyLabel="Aucun rayon ne correspond"
        required={required}
        className={className}
      />
      <button
        type="button"
        onClick={() => {
          setCreatingNew(true);
          onChange('');
        }}
        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors whitespace-nowrap flex-shrink-0"
        title="Créer un rayon qui n'existe pas encore"
      >
        + Nouveau
      </button>
    </div>
  );
}
