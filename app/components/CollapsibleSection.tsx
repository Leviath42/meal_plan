'use client';

import { useState, type ReactNode } from 'react';

// Section repliable : en-tête cliquable (titre + compteur + chevron), contenu
// masqué quand repliée. Utilisée sur les pages Recettes, Ingrédients et Courses.
export default function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-lg shadow-sm mb-2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 sm:py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-sm sm:text-base text-gray-800 truncate">{title}</span>
        <span className="flex items-center gap-2 flex-shrink-0">
          {typeof count === 'number' && (
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">
              {count}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
