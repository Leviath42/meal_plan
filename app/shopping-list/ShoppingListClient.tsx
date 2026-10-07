'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import {
  addManualShoppingItem,
  deleteShoppingItem,
  generateShoppingList,
  toggleShoppingItem,
} from '@/app/actions/shopping';
import {
  SHOPPING_PERIOD_PRESETS,
  type ShoppingFormState,
  type ShoppingItemView,
} from '@/lib/validators/shopping';

// Formater une Date en YYYY-MM-DD selon le fuseau local (comme PlannerBoard)
function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parser une date YYYY-MM-DD en Date locale (minuit local, sans décalage UTC)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Quantité affichée sans résidus flottants (2.5, 3, 0.125)
function formatQuantity(quantity: number): string {
  return String(Math.round(quantity * 1000) / 1000);
}

export default function ShoppingListClient({ items: initialItems }: { items: ShoppingItemView[] }) {
  // Copie locale pour un retour immédiat (optimiste), resynchronisée à chaque
  // revalidation serveur (les actions appellent revalidatePath('/shopping-list'))
  const [items, setItems] = useState<ShoppingItemView[]>(initialItems);
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Période sélectionnée pour la génération (à partir d'aujourd'hui)
  const [days, setDays] = useState<number>(7);

  const [generateState, generateAction, generatePending] = useActionState<
    ShoppingFormState,
    FormData
  >(generateShoppingList, null);
  const [addState, addAction, addPending] = useActionState<ShoppingFormState, FormData>(
    addManualShoppingItem,
    null
  );

  // Bandeau de message (erreur ou info), fermé tout seul après 6 secondes
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Champs contrôlés du formulaire d'ajout manuel
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState('1');
  const [manualUnit, setManualUnit] = useState('pièce');

  // Vider le formulaire quand l'ajout a réussi
  useEffect(() => {
    if (addState?.success) {
      setManualName('');
      setManualQuantity('1');
      setManualUnit('pièce');
    }
  }, [addState]);

  // Bornes de la période sélectionnée (aujourd'hui → J+days-1)
  const range = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days - 1);
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
  }, [days]);

  const formatDateLabel = (dateStr: string): string =>
    parseLocalDate(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  // Groupement par rayon (catégorie), rayons et articles triés alphabétiquement
  const groups = useMemo(() => {
    const map = new Map<string, ShoppingItemView[]>();
    for (const item of items) {
      const key = item.category || 'Divers';
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()]
      .map(([category, groupItems]) => ({
        category,
        items: groupItems.sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      }))
      .sort((a, b) => a.category.localeCompare(b.category, 'fr'));
  }, [items]);

  const boughtCount = items.filter((item) => item.isBought).length;

  // Cocher / décocher : mise à jour optimiste, retour arrière si échec
  const handleToggle = async (item: ShoppingItemView, isBought: boolean) => {
    setItems((prev) =>
      prev.map((current) => (current.id === item.id ? { ...current, isBought } : current))
    );
    const result = await toggleShoppingItem(item.id, isBought);
    if (!result.success) {
      setItems((prev) =>
        prev.map((current) =>
          current.id === item.id ? { ...current, isBought: !isBought } : current
        )
      );
      setNotice(result.message);
    }
  };

  // Supprimer : mise à jour optimiste, retour arrière si échec
  const handleDelete = async (item: ShoppingItemView) => {
    const previous = items;
    setItems((prev) => prev.filter((current) => current.id !== item.id));
    const result = await deleteShoppingItem(item.id);
    if (!result.success) {
      setItems(previous);
      setNotice(result.message);
    }
  };

  // Copier la liste en texte brut, formatée par rayon
  const handleCopy = async () => {
    const lines: string[] = ['Liste de courses'];
    for (const group of groups) {
      lines.push('', `${group.category} :`);
      for (const item of group.items) {
        lines.push(
          `${item.isBought ? '[x]' : '[ ]'} ${item.name} — ${formatQuantity(item.quantity)} ${item.unit}`
        );
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setNotice('Liste copiée dans le presse-papier');
    } catch {
      setNotice('Impossible de copier la liste');
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="bg-accent-soft text-gray-800 rounded-lg p-3 text-xs sm:text-sm">
          {notice}
        </div>
      )}

      {/* Génération depuis le planning */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <h2 className="font-medium text-sm sm:text-base mb-2">Générer depuis le planning</h2>
        <form action={generateAction} className="space-y-2">
          <input type="hidden" name="days" value={days} />
          <div className="flex flex-wrap gap-2">
            {SHOPPING_PERIOD_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDays(preset)}
                className={`px-3 py-1.5 rounded border text-xs sm:text-sm ${
                  days === preset
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {preset} jours
              </button>
            ))}
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Du {formatDateLabel(range.start)} au {formatDateLabel(range.end)}
          </p>
          <button
            type="submit"
            disabled={generatePending}
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover text-xs sm:text-sm disabled:opacity-50"
          >
            {generatePending ? 'Génération...' : 'Générer la liste'}
          </button>
          {generateState && !generateState.success && (
            <p className="text-red-500 text-xs sm:text-sm">{generateState.message}</p>
          )}
          {generateState?.success && (
            <p className="text-green-700 text-xs sm:text-sm">{generateState.message}</p>
          )}
        </form>
      </div>

      {/* Résumé + copie */}
      <div className="bg-white rounded-lg shadow-sm p-3 flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-gray-600">
          {items.length} article{items.length > 1 ? 's' : ''} — {boughtCount} acheté
          {boughtCount > 1 ? 's' : ''}
        </p>
        <button
          onClick={handleCopy}
          disabled={items.length === 0}
          className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm disabled:opacity-50"
        >
          Copier la liste
        </button>
      </div>

      {/* Ajout manuel */}
      <form action={addAction} className="bg-white rounded-lg shadow-sm p-3 space-y-2">
        <h2 className="font-medium text-sm sm:text-base">Ajouter un article</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input
            type="text"
            name="name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Nom de l'article"
            required
            className="p-2 border border-gray-300 rounded bg-white text-gray-800 text-xs sm:text-sm"
          />
          <input
            type="number"
            name="quantity"
            value={manualQuantity}
            onChange={(e) => setManualQuantity(e.target.value)}
            min="0"
            step="any"
            placeholder="Quantité"
            required
            className="p-2 border border-gray-300 rounded bg-white text-gray-800 text-xs sm:text-sm"
          />
          <input
            type="text"
            name="unit"
            value={manualUnit}
            onChange={(e) => setManualUnit(e.target.value)}
            placeholder="Unité (ex: pièce)"
            required
            className="p-2 border border-gray-300 rounded bg-white text-gray-800 text-xs sm:text-sm"
          />
          <button
            type="submit"
            disabled={addPending}
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover text-xs sm:text-sm disabled:opacity-50"
          >
            {addPending ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
        {addState && !addState.success && (
          <p className="text-red-500 text-xs sm:text-sm">{addState.message}</p>
        )}
      </form>

      {/* Articles groupés par rayon */}
      {groups.length === 0 ? (
        <p className="text-center text-gray-500 text-xs sm:text-sm py-6">
          Aucun article — générez la liste depuis le planning ou ajoutez-en un à la main.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.category} className="bg-white rounded-lg shadow-sm p-3">
              <h3 className="font-medium text-sm sm:text-base mb-2">{group.category}</h3>
              <ul className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={item.isBought}
                      onChange={(e) => handleToggle(item, e.target.checked)}
                      className="w-4 h-4 accent-accent"
                      aria-label={`${item.isBought ? 'Décocher' : 'Cocher'} ${item.name}`}
                    />
                    <span
                      className={`flex-1 min-w-0 text-xs sm:text-sm truncate ${
                        item.isBought ? 'line-through text-gray-400' : ''
                      }`}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      {formatQuantity(item.quantity)} {item.unit}
                    </span>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Supprimer"
                      aria-label={`Supprimer ${item.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
