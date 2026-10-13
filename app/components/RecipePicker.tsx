'use client';

// Sélecteur de recettes par mots-clés : remplace le <select> natif dont la
// liste filante n'est pas adaptée à un grand catalogue. Champs de recherche,
// filtrage instantané (titre, tags, type de plat, insensible aux accents),
// navigation clavier (flèches + Entrée, Échap ferme), bouton d'effacement.
import { useState, useRef, useEffect, useMemo } from 'react';
import type { Recipe } from '@/app/types/meal-plan';

// Normalisation : minuscules + suppression des diacritiques pour une
// recherche insensible aux accents ("gruyere" trouve "Gruyère")
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Libellés des types de plats pour l'affichage dans les résultats
const MEAL_COURSE_LABELS: Record<string, string> = {
  'apéritif': 'Apéritif',
  'entrée': 'Entrée',
  'plat': 'Plat principal',
  'accompagnement': 'Accompagnement',
  'dessert': 'Dessert',
  'boisson': 'Boisson',
};

const MAX_RESULTS = 30;

export default function RecipePicker({
  recipes,
  value,
  onChange,
  placeholder = 'Rechercher une recette…',
  disabled = false,
  id,
}: {
  recipes: Recipe[];
  // Identifiant de la recette sélectionnée ('' = aucune)
  value: string;
  onChange: (recipeId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedRecipe = recipes.find((r) => r.id === value) ?? null;

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Filtrage par mots-clés (tous les mots doivent apparaître)
  const results = useMemo(() => {
    if (!query.trim()) return recipes.slice(0, MAX_RESULTS);
    const keywords = normalize(query).split(/\s+/).filter(Boolean);
    return recipes
      .filter((recipe) => {
        const haystack = normalize(
          [recipe.title, recipe.tags ?? '', MEAL_COURSE_LABELS[recipe.mealCourse ?? ''] ?? ''].join(' ')
        );
        return keywords.every((keyword) => haystack.includes(keyword));
      })
      .slice(0, MAX_RESULTS);
  }, [recipes, query]);

  // Réinitialiser la surbrillance quand la liste change
  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  const selectRecipe = (recipe: Recipe | null) => {
    onChange(recipe ? recipe.id : '');
    setQuery('');
    setOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' && open) {
      event.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (event.key === 'ArrowUp' && open) {
      event.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (results[highlightIndex]) selectRecipe(results[highlightIndex]);
      return;
    }
  };

  // Champ en lecture seule quand une recette est sélectionnée et qu'on ne
  // cherche pas : il affiche son titre, un clic rouvre la recherche
  const showQuery = query !== '' || open || !selectedRecipe;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={id ? `${id}-listbox` : undefined}
          value={showQuery ? query : selectedRecipe.title}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={selectedRecipe ? selectedRecipe.title : placeholder}
          className="w-full p-2 border rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-gray-100 disabled:text-gray-500"
        />
        {(selectedRecipe || query) && !disabled && (
          <button
            type="button"
            onClick={() => selectRecipe(null)}
            title="Retirer la recette"
            aria-label="Retirer la recette"
            className="p-2 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && !disabled && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">
              Aucune recette ne correspond à «&nbsp;{query}&nbsp;»
            </li>
          ) : (
            results.map((recipe, index) => (
              <li key={recipe.id} role="option" aria-selected={recipe.id === value}>
                <button
                  type="button"
                  onClick={() => selectRecipe(recipe)}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    index === highlightIndex ? 'bg-accent-soft' : 'hover:bg-gray-50'
                  } ${recipe.id === value ? 'font-medium text-accent' : 'text-gray-800'}`}
                >
                  <span className="block truncate">{recipe.title}</span>
                  {recipe.mealCourse && (
                    <span className="block text-xs text-gray-400">
                      {MEAL_COURSE_LABELS[recipe.mealCourse] ?? recipe.mealCourse}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
          {results.length === MAX_RESULTS && (
            <li className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">
              {MAX_RESULTS} premiers résultats — affinez pour voir plus
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
