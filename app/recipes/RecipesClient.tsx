'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CollapsibleSection from '@/app/components/CollapsibleSection';
import DeleteRecipeButton from '@/app/recipes/DeleteRecipeButton';

export interface RecipeListItem {
  id: string;
  title: string;
  description: string | null;
  prepTime: number;
  cookTime: number;
  defaultServings: number;
  mealCourse: string | null;
  tags: string | null;
}

// Ordre d'affichage des types de plat (les recettes sans type en dernier)
const MEAL_COURSE_LABELS: Record<string, string> = {
  'apéritif': 'Apéritif',
  'entrée': 'Entrée',
  'plat': 'Plat principal',
  'accompagnement': 'Accompagnement',
  'dessert': 'Dessert',
  'boisson': 'Boisson',
};
const MEAL_COURSE_ORDER = Object.keys(MEAL_COURSE_LABELS);
const UNTYPED = '__untyped__';

// Liste des recettes : recherche texte (titre, description, tags) et
// sections repliables par type de plat.
export default function RecipesClient({ recipes }: { recipes: RecipeListItem[] }) {
  const [search, setSearch] = useState('');

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedSearch) return recipes;
    return recipes.filter((recipe) => {
      const haystack = [
        recipe.title,
        recipe.description ?? '',
        recipe.tags ?? '',
        MEAL_COURSE_LABELS[recipe.mealCourse ?? ''] ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [recipes, normalizedSearch]);

  const groups = useMemo(() => {
    const byCourse = new Map<string, RecipeListItem[]>();
    for (const recipe of filtered) {
      const key = recipe.mealCourse && MEAL_COURSE_LABELS[recipe.mealCourse] ? recipe.mealCourse : UNTYPED;
      const list = byCourse.get(key) ?? [];
      list.push(recipe);
      byCourse.set(key, list);
    }
    return [...byCourse.entries()]
      .map(([key, items]) => ({
        key,
        label: key === UNTYPED ? 'Sans type de plat' : MEAL_COURSE_LABELS[key],
        items,
      }))
      .sort((a, b) => {
        const orderA = a.key === UNTYPED ? 99 : MEAL_COURSE_ORDER.indexOf(a.key);
        const orderB = b.key === UNTYPED ? 99 : MEAL_COURSE_ORDER.indexOf(b.key);
        return orderA - orderB;
      });
  }, [filtered]);

  return (
    <div>
      {/* Recherche */}
      <div className="mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une recette, un tag, un type de plat…"
          className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {normalizedSearch && (
          <p className="text-xs text-gray-500 mt-1">
            {filtered.length} recette{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs sm:text-sm text-gray-500">
            {recipes.length === 0 ? 'Aucune recette — créez la première !' : 'Aucune recette ne correspond à la recherche.'}
          </p>
          {recipes.length === 0 && (
            <Link href="/recipes/new" className="text-accent hover:underline mt-2 inline-block text-xs sm:text-sm">
              Ajouter une recette
            </Link>
          )}
        </div>
      ) : (
        groups.map((group) => (
          <CollapsibleSection key={group.key} title={group.label} count={group.items.length}>
            <ul className="divide-y divide-gray-100">
              {group.items.map((r) => {
                const totalTime = r.prepTime + r.cookTime;
                return (
                  <li key={r.id} className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/recipes/${r.id}`}
                          className="text-sm sm:text-base font-semibold text-accent hover:underline truncate block"
                        >
                          {r.title}
                        </Link>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">
                          <span>{totalTime} min</span>
                          {r.defaultServings > 0 && (
                            <>
                              <span className="mx-1">·</span>
                              <span>{r.defaultServings} pers.</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Link
                          href={`/recipes/${r.id}/edit`}
                          className="text-xs sm:text-sm bg-gray-100 text-gray-700 rounded px-2 sm:px-3 py-1 hover:bg-gray-200 transition-colors whitespace-nowrap"
                        >
                          Modifier
                        </Link>
                        <DeleteRecipeButton id={r.id} title={r.title} />
                      </div>
                    </div>
                    {r.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-2">{r.description}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </CollapsibleSection>
        ))
      )}
    </div>
  );
}
