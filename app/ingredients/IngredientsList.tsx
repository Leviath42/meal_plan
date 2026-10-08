'use client';

import { useMemo, useState } from 'react';
import CollapsibleSection from '@/app/components/CollapsibleSection';
import IngredientRow from '@/app/ingredients/IngredientRow';

export interface IngredientItem {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
}

// Liste des ingrédients : recherche par nom et sections repliables par rayon.
export default function IngredientsList({ ingredients }: { ingredients: IngredientItem[] }) {
  const [search, setSearch] = useState('');

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedSearch) return ingredients;
    return ingredients.filter(
      (ingredient) =>
        ingredient.name.toLowerCase().includes(normalizedSearch) ||
        ingredient.category.toLowerCase().includes(normalizedSearch)
    );
  }, [ingredients, normalizedSearch]);

  const groups = useMemo(() => {
    const byCategory = new Map<string, IngredientItem[]>();
    for (const ingredient of filtered) {
      const key = ingredient.category || 'Divers';
      const list = byCategory.get(key) ?? [];
      list.push(ingredient);
      byCategory.set(key, list);
    }
    return [...byCategory.entries()]
      .map(([category, items]) => ({ category, items }))
      .sort((a, b) => a.category.localeCompare(b.category, 'fr'));
  }, [filtered]);

  return (
    <div>
      {/* Recherche */}
      <div className="mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un ingrédient ou un rayon…"
          className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {normalizedSearch && (
          <p className="text-xs text-gray-500 mt-1">
            {filtered.length} ingrédient{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border-t border-b border-gray-200 py-4 text-center text-xs sm:text-sm text-gray-500">
          {ingredients.length === 0
            ? 'Aucun ingrédient — ajoutez-en un !'
            : 'Aucun ingrédient ne correspond à la recherche.'}
        </div>
      ) : (
        groups.map((group) => (
          <CollapsibleSection key={group.category} title={group.category} count={group.items.length} defaultOpen={false}>
            <ul className="divide-y divide-gray-100 px-1">
              {group.items.map((ingredient) => (
                <IngredientRow key={ingredient.id} {...ingredient} />
              ))}
            </ul>
          </CollapsibleSection>
        ))
      )}
    </div>
  );
}
