'use client';

import { useState } from 'react';

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
    <select
      id={id}
      value={value}
      required={required}
      className={className}
      onChange={(e) => {
        if (e.target.value === '__new__') {
          setCreatingNew(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
    >
      <option value="">Sélectionnez un rayon…</option>
      {categories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
      <option value="__new__">+ Nouveau rayon…</option>
    </select>
  );
}
