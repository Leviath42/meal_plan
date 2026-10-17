'use client';
import { formatQuantity, formatWeekdayDayMonth, toLocalDateStr, parseLocalDate } from '@/lib/format';
import CollapsibleSection from '@/app/components/CollapsibleSection';

// Normalisation insensible aux accents pour la recherche d'ingrédients
function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

import { useActionState, useEffect, useMemo, useState } from 'react';
import {
  addManualShoppingItem,
  deleteShoppingItem,
  generateShoppingList,
  purgeShoppingList,
  toggleShoppingItem,
} from '@/app/actions/shopping';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import {
  SHOPPING_PERIOD_PRESETS,
  type ShoppingFormState,
  type ShoppingItemView,
} from '@/lib/validators/shopping';

export interface CatalogIngredient {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
}

// Liste de courses : génération depuis le planning + cochage/suppression.
// L'ajout manuel cherche dans le catalogue d'ingrédients (suggestions nom +
// rayon, unité pré-remplie) tout en gardant la saisie libre possible.
export default function ShoppingListClient({
  items: initialItems,
  catalogIngredients = [],
}: {
  items: ShoppingItemView[];
  catalogIngredients?: CatalogIngredient[];
}) {
  // Copie locale pour un retour immédiat (optimiste), resynchronisée à chaque
  // revalidation serveur (les actions appellent revalidatePath('/shopping-list'))
  const [items, setItems] = useState<ShoppingItemView[]>(initialItems);
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Période sélectionnée pour la génération (à partir d'aujourd'hui)
  const [days, setDays] = useState<number>(7);
  // Sections : toutes dépliées par défaut, bascule globale (la clé de
  // remontage force CollapsibleSection à réinitialiser son état interne)
  const [allOpen, setAllOpen] = useState(true);
  // Masquer les articles déjà achetés (ils restent cochés en base)
  // Masquer les achetés : actif par défaut — en courses, ce qui est coché
  // n'a plus d'intérêt visuel, la page se rapproche de la pending list
  const [hideBought, setHideBought] = useState(true);
  // Formulaire d'ajout manuel : révélé par « + Nouvel article »
  // (même comportement que les pages Recettes et Ingrédients)
  const [addOpen, setAddOpen] = useState(false);
  // Génération depuis le planning : ouverte via le bouton « Générer »
  const [generateOpen, setGenerateOpen] = useState(false);
  // Purge de la liste : ConfirmDialog avant l'irréversible.
  // Étendue par défaut : achetés seulement (purge de fin de courses) ;
  // « tout » est le choix explicite pour repartir de zéro.
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);
  const [purgeBoughtOnly, setPurgeBoughtOnly] = useState(true);
  const [purging, setPurging] = useState(false);

  // Sélection précise : plage de dates libre (mode « personnalisé »)
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [customStart, setCustomStart] = useState<string>(toLocalDateStr(new Date()));
  const [customEnd, setCustomEnd] = useState<string>(
    toLocalDateStr(new Date(new Date().setDate(new Date().getDate() + 7)))
  );

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
  // Ingrédient du catalogue sélectionné via la recherche (liaison du rayon)
  const [manualIngredientId, setManualIngredientId] = useState('');
  const [suggestions, setSuggestions] = useState<CatalogIngredient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manualQuantity, setManualQuantity] = useState('1');
  const [manualUnit, setManualUnit] = useState('pièce');

  // Vider le formulaire quand l'ajout a réussi
  useEffect(() => {
    if (addState?.success) {
      setManualName('');
      setManualIngredientId('');
      setSuggestions([]);
      setManualQuantity('1');
      setManualUnit('pièce');
    }
  }, [addState]);

  // Bornes de la période sélectionnée : aujourd'hui → J+days-1, ou la
  // plage de dates précises choisie par l'utilisateur
  const range = useMemo(() => {
    if (mode === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days - 1);
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
  }, [mode, days, customStart, customEnd]);

  const formatDateLabel = (dateStr: string): string =>
    formatWeekdayDayMonth(parseLocalDate(dateStr));

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

  // En mode « masquer les achetés » : articles cochés retirés de l'affichage
  // (ils restent en base) et rayons devenus vides non affichés
  const visibleGroups = useMemo(() => {
    if (!hideBought) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.isBought),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, hideBought]);

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

  // Purger toute la liste (générés + manuels, achetés ou non)
  const handlePurge = async () => {
    setPurgeConfirmOpen(false);
    setPurging(true);
    try {
      const result = await purgeShoppingList(purgeBoughtOnly);
      setNotice(result.message);
    } catch {
      setNotice('Impossible de purger la liste');
    } finally {
      setPurging(false);
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

      {/* Rangée titre + bouton : même structure que les pages Recettes
          (« Mes recettes » / « + Nouvelle recette ») et Ingrédients */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-lg sm:text-xl font-bold">Liste de courses</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setGenerateOpen(true)}
            className="border border-accent text-accent rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent-soft transition-colors whitespace-nowrap"
          >
            Générer
          </button>
          <button
            type="button"
            onClick={() => setAddOpen((value) => !value)}
            className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent-hover transition-colors whitespace-nowrap"
          >
            {addOpen ? 'Fermer' : '+ Nouvel article'}
          </button>
        </div>
      </div>

      {/* Ajout manuel : formulaire révélé au clic sur « + Nouvel article » */}
      {addOpen && (
        <form action={addAction} className="bg-white rounded-lg shadow-sm p-3 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="relative">
              <input
                type="text"
                name="name"
                value={manualName}
                onChange={(e) => {
                  setManualName(e.target.value);
                  setManualIngredientId('');
                  const q = normalizeText(e.target.value.trim());
                  if (!q) {
                    setSuggestions([]);
                    setShowSuggestions(false);
                  } else {
                    const matches = catalogIngredients
                      .filter((ingredient) => normalizeText(ingredient.name).includes(q))
                      .slice(0, 8);
                    setSuggestions(matches);
                    setShowSuggestions(true);
                  }
                }}
                onFocus={() => manualName && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder={catalogIngredients.length > 0 ? "Rechercher un ingrédient… (ou saisie libre)" : "Nom de l'article"}
                required
                autoComplete="off"
                className="p-2 border border-gray-300 rounded bg-white text-gray-800 text-xs sm:text-sm w-full"
              />
              <input type="hidden" name="ingredientId" value={manualIngredientId} />
              {showSuggestions && suggestions.length > 0 && (
                <ul role="listbox" className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {suggestions.map((ingredient) => (
                    <li key={ingredient.id} role="option" aria-selected={ingredient.id === manualIngredientId}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setManualName(ingredient.name);
                          setManualIngredientId(ingredient.id);
                          setManualUnit(ingredient.defaultUnit || 'pièce');
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-accent-soft transition-colors"
                      >
                        <span className="block truncate">{ingredient.name}</span>
                        <span className="block text-xs text-gray-400 truncate">{ingredient.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              type="number"
              name="quantity"
              value={manualQuantity}
              onChange={(e) => setManualQuantity(e.target.value)}
              min="0.01"
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
      )}

      {/* Génération depuis le planning : modal (bouton « Générer » à côté du titre) */}
      {generateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="generate-modal-title"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setGenerateOpen(false); }}
        >
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 id="generate-modal-title" className="font-bold text-lg text-gray-800">
                Générer depuis le planning
              </h3>
              <button
                type="button"
                onClick={() => setGenerateOpen(false)}
                aria-label="Fermer"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <form action={generateAction} className="space-y-3">
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="days" value={days} />
          <input type="hidden" name="startDate" value={mode === 'custom' ? customStart : ''} />
          <input type="hidden" name="endDate" value={mode === 'custom' ? customEnd : ''} />
          <div className="flex flex-wrap items-center gap-2">
            {SHOPPING_PERIOD_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setMode('preset');
                  setDays(preset);
                }}
                className={`px-3 py-1.5 rounded border text-xs sm:text-sm ${
                  mode === 'preset' && days === preset
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {preset} jours
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`px-3 py-1.5 rounded border text-xs sm:text-sm ${
                mode === 'custom'
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Dates précises
            </button>
            <span className="text-xs sm:text-sm text-gray-500">
              Du {formatDateLabel(range.start)} au {formatDateLabel(range.end)}
            </span>
          </div>
          {mode === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs sm:text-sm text-gray-600">
                Du
                <input
                  type="date"
                  value={customStart}
                  min={toLocalDateStr(new Date())}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="ml-2 border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
              <label className="text-xs sm:text-sm text-gray-600">
                au
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || toLocalDateStr(new Date())}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="ml-2 border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
            </div>
          )}
          {generateState && !generateState.success && (
            <p className="text-red-500 text-xs sm:text-sm">{generateState.message}</p>
          )}
          {generateState?.success && (
            <p className="text-green-700 text-xs sm:text-sm">{generateState.message}</p>
          )}

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setGenerateOpen(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-50 text-xs sm:text-sm"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    disabled={generatePending}
                    className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover text-xs sm:text-sm disabled:opacity-50"
                  >
                    {generatePending ? 'Génération...' : 'Générer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Résumé + actions de consultation */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
            {items.length} article{items.length > 1 ? 's' : ''} — {boughtCount} acheté
            {boughtCount > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Masquer les articles achetés (utile en fin de courses) */}
            <label className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideBought}
                onChange={(e) => setHideBought(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              Masquer les achetés
            </label>
            {/* Plier/déplier tous les rayons d'un coup */}
            <button
              type="button"
              onClick={() => setAllOpen((value) => !value)}
              disabled={items.length === 0}
              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm disabled:opacity-50"
            >
              {allOpen ? 'Tout plier' : 'Tout déplier'}
            </button>
            <button
              onClick={handleCopy}
              disabled={items.length === 0}
              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm disabled:opacity-50"
            >
              Copier la liste
            </button>
            <button
              onClick={() => setPurgeConfirmOpen(true)}
              disabled={items.length === 0 || purging}
              className="px-3 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50 text-xs sm:text-sm disabled:opacity-50 transition-colors"
              title="Vider entièrement la liste (articles générés et manuels)"
            >
              {purging ? 'Purge...' : 'Purger'}
            </button>
          </div>
        </div>
      </div>

      {/* Articles groupés par rayon */}
      {visibleGroups.length === 0 ? (
        <p className="text-center text-gray-500 text-xs sm:text-sm py-6">
          {hideBought
            ? 'Tous les articles affichables sont achetés — démasquez-les pour les revoir.'
            : 'Aucun article — générez la liste depuis le planning ou ajoutez-en un via « + Nouvel article ».'}
        </p>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((group) => (
            <CollapsibleSection
              key={`${group.category}-${allOpen}`}
              title={group.category}
              count={group.items.filter((item) => !item.isBought).length}
              defaultOpen={allOpen}
            >
              <ul className="divide-y divide-gray-100 px-1">
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
            </CollapsibleSection>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={purgeConfirmOpen}
        title="Purger la liste de courses"
        message={
          <>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="purge-scope"
                  checked={purgeBoughtOnly}
                  onChange={() => setPurgeBoughtOnly(true)}
                  className="accent-accent"
                />
                <span>
                  Les <strong>{boughtCount} article{boughtCount > 1 ? 's' : ''} acheté{boughtCount > 1 ? 's' : ''}</strong> seulement
                  <span className="block text-xs text-gray-400">Fin de courses — les articles restant à acheter sont conservés</span>
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="purge-scope"
                  checked={!purgeBoughtOnly}
                  onChange={() => setPurgeBoughtOnly(false)}
                  className="accent-accent"
                />
                <span>
                  <strong>Toute</strong> la liste ({items.length} article{items.length > 1 ? 's' : ''})
                  <span className="block text-xs text-gray-400">Repartir de zéro — achetés et à acheter</span>
                </span>
              </label>
            </div>
          </>
        }
        confirmLabel="Purger"
        pending={purging}
        onCancel={() => setPurgeConfirmOpen(false)}
        onConfirm={handlePurge}
      />
    </div>
  );
}
