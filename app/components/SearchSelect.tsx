'use client';

// SearchSelect : sélecteur générique par recherche (remplace les <select>
// natifs dont la liste déroulante interminable n'est pas adaptée à un grand
// catalogue). Même UX que RecipePicker : filtrage instantané multi-mots,
// insensible aux accents/casse, navigation clavier, bouton d'effacement.
// items : liste de { value, label, hint? } — hint affiché en petit sous le label.
import { useState, useRef, useEffect, useMemo } from 'react';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const MAX_RESULTS = 30;

export interface SearchSelectItem {
  value: string;
  label: string;
  hint?: string;
}

export default function SearchSelect({
  id,
  items,
  value,
  onChange,
  placeholder = 'Rechercher…',
  emptyLabel = 'Aucun résultat',
  required = false,
  disabled = false,
  className,
}: {
  id: string;
  items: SearchSelectItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find((i) => i.value === value) ?? null;

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

  const results = useMemo(() => {
    if (!query.trim()) return items.slice(0, MAX_RESULTS);
    const keywords = normalize(query).split(/\s+/).filter(Boolean);
    return items
      .filter((item) => {
        const haystack = normalize([item.label, item.hint ?? ''].join(' '));
        return keywords.every((k) => haystack.includes(k));
      })
      .slice(0, MAX_RESULTS);
  }, [items, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  const select = (item: SearchSelectItem | null) => {
    onChange(item ? item.value : '');
    setQuery('');
    setOpen(false);
  };

  const showQuery = query !== '' || open || !selectedItem;

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          value={showQuery ? query : selectedItem.label}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
            } else if (e.key === 'ArrowDown' && open) {
              e.preventDefault();
              setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === 'ArrowUp' && open) {
              e.preventDefault();
              setHighlightIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && open) {
              e.preventDefault();
              if (results[highlightIndex]) select(results[highlightIndex]);
            }
          }}
          disabled={disabled}
          required={required && !selectedItem}
          placeholder={selectedItem ? selectedItem.label : placeholder}
          className={className ?? 'w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-gray-100 disabled:text-gray-500'}
        />
        {(selectedItem || query) && !disabled && (
          <button
            type="button"
            onClick={() => select(null)}
            title="Effacer la sélection"
            aria-label="Effacer la sélection"
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
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">{emptyLabel}</li>
          ) : (
            results.map((item, index) => (
              <li key={item.value} role="option" aria-selected={item.value === value}>
                <button
                  type="button"
                  onClick={() => select(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    index === highlightIndex ? 'bg-accent-soft' : 'hover:bg-gray-50'
                  } ${item.value === value ? 'font-medium text-accent' : 'text-gray-800'}`}
                >
                  <span className="block truncate">{item.label}</span>
                  {item.hint && <span className="block text-xs text-gray-400 truncate">{item.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
