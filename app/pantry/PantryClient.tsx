'use client';

// F11 — Garde-manger : saisie du stock par ingrédient (une ligne par
// ingrédient, quantité décimale, unité, péremption optionnelle), alerte
// visuelle sur les produits périmés, et indication que la génération de
// courses déduit automatiquement ce stock.
import { useActionState, useEffect, useState } from 'react';
import SearchSelect from '@/app/components/SearchSelect';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import { formatQuantity, parseLocalDate, formatDayMonthYear } from '@/lib/format';
import { savePantryItem, removePantryItem } from '@/app/actions/pantry';
import type { PantryFormState, PantryItemView } from '@/lib/validators/pantry';

export interface CatalogIngredient {
  id: string;
  name: string;
  category: string;
  defaultUnit: string | null;
}

export default function PantryClient({
  items: initialItems,
  catalogIngredients = [],
}: {
  items: PantryItemView[];
  catalogIngredients?: CatalogIngredient[];
}) {
  // Copie locale (retour immédiat des suppressions), resynchronisée à
  // chaque revalidation serveur (les actions appellent revalidatePath)
  const [items, setItems] = useState<PantryItemView[]>(initialItems);
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PantryItemView | null>(null);

  // Formulaire : l'ingrédient vient du SearchSelect partagé ; en édition on
  // garde l'ingrédient existant (une ligne par ingrédient, on ne déplace pas)
  const [editing, setEditing] = useState<PantryItemView | null>(null);
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const [saveState, saveAction, savePending] = useActionState<PantryFormState, FormData>(
    savePantryItem,
    null
  );

  // Bandeau de message fermé tout seul après 6 s (même UX que les courses)
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Succès : fermer/vider le formulaire, la revalidation serveur apporte
  // la liste à jour
  useEffect(() => {
    if (saveState?.success) {
      setNotice(saveState.message);
      setFormOpen(false);
      resetForm();
    }
  }, [saveState]);

  const resetForm = () => {
    setEditing(null);
    setIngredientId('');
    setQuantity('');
    setUnit('');
    setExpiresAt('');
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (item: PantryItemView) => {
    setEditing(item);
    setIngredientId(item.ingredientId);
    setQuantity(String(item.quantity));
    setUnit(item.unit);
    setExpiresAt(item.expiresAt ?? '');
    setFormOpen(true);
  };

  const selectIngredient = (id: string) => {
    setIngredientId(id);
    // Pré-remplissage de l'unité avec celle du catalogue si le champ est vide
    const found = catalogIngredients.find((ingredient) => ingredient.id === id);
    if (found && !unit && found.defaultUnit) {
      setUnit(found.defaultUnit);
    }
  };

  const handleDelete = async () => {
    const item = deleting;
    setDeleting(null);
    if (!item) return;
    const previous = items;
    setItems((prev) => prev.filter((current) => current.id !== item.id));
    const result = await removePantryItem(item.id);
    if (!result.success) {
      setItems(previous);
      setNotice(result.message);
    } else {
      setNotice(result.message);
    }
  };

  const expiredItems = items.filter((item) => item.expired);

  return (
    <div className="space-y-4">
      {notice && (
        <div className="bg-accent-soft text-gray-800 rounded-lg p-3 text-xs sm:text-sm">{notice}</div>
      )}

      {/* Alerte péremption : les produits concernés restent visibles tant
          que la ligne n'est pas retirée du garde-manger */}
      {expiredItems.length > 0 && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-xs sm:text-sm"
        >
          <span className="font-semibold">
            {expiredItems.length} produit{expiredItems.length > 1 ? 's' : ''} périmé
            {expiredItems.length > 1 ? 's' : ''} au garde-manger
          </span>{' '}
          — {expiredItems.map((item) => item.name).join(', ')} : à retirer ou à consommer sans attendre.
        </div>
      )}

      {/* Rangée titre + bouton : même structure que les pages Courses et
          Ingrédients */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Garde-manger</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            La génération de courses déduit ce stock — ce que vous avez déjà ne sera pas re-demandé.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (formOpen ? setFormOpen(false) : openCreate())}
          className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent-hover transition-colors whitespace-nowrap"
        >
          {formOpen ? 'Fermer' : '+ Ajouter du stock'}
        </button>
      </div>

      {/* Formulaire : recherche d'ingrédient (SearchSelect partagé),
          quantité décimale, unité, péremption optionnelle */}
      {formOpen && (
        <form action={saveAction} className="bg-white rounded-lg shadow-sm p-3 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-start">
            <div className="col-span-2">
              <label htmlFor="pantry-ingredient" className="block text-xs text-gray-500 mb-1">
                {editing ? `Ingrédient : ${editing.name} (quantité mise à jour)` : 'Ingrédient'}
              </label>
              <SearchSelect
                id="pantry-ingredient"
                items={catalogIngredients.map((ingredient) => ({
                  value: ingredient.id,
                  label: ingredient.name,
                  hint: ingredient.category,
                }))}
                value={ingredientId}
                onChange={selectIngredient}
                disabled={!!editing}
                placeholder={catalogIngredients.length > 0 ? 'Rechercher un ingrédient…' : 'Catalogue vide'}
              />
              <input type="hidden" name="ingredientId" value={ingredientId} />
            </div>
            <div>
              <label htmlFor="pantry-quantity" className="block text-xs text-gray-500 mb-1">
                Quantité
              </label>
              <input
                id="pantry-quantity"
                type="number"
                name="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0.001"
                step="any"
                inputMode="decimal"
                placeholder="ex: 200 ou 0,5"
                required
                className="p-2 border border-gray-300 rounded bg-white text-gray-800 text-xs sm:text-sm w-full"
              />
            </div>
            <div>
              <label htmlFor="pantry-unit" className="block text-xs text-gray-500 mb-1">
                Unité
              </label>
              <input
                id="pantry-unit"
                type="text"
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="ex: g, pièce"
                required
                maxLength={30}
                className="p-2 border border-gray-300 rounded bg-white text-gray-800 text-xs sm:text-sm w-full"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="pantry-expires" className="block text-xs text-gray-500 mb-1">
                Péremption (optionnel)
              </label>
              <input
                id="pantry-expires"
                type="date"
                name="expiresAt"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="p-2 border border-gray-300 rounded bg-white text-gray-800 text-xs sm:text-sm"
              />
            </div>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={savePending}
              className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover text-xs sm:text-sm disabled:opacity-50"
            >
              {savePending ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
          {saveState && !saveState.success && (
            <p className="text-red-500 text-xs sm:text-sm">{saveState.message}</p>
          )}
        </form>
      )}

      {/* Liste du stock */}
      {items.length === 0 ? (
        <p className="text-center text-gray-500 text-xs sm:text-sm py-6">
          Aucun stock enregistré — ajoutez ce que vous avez déjà dans vos placards.
        </p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm">
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <span className="block text-xs sm:text-sm text-gray-800 truncate" title={item.name}>
                    {item.name}
                  </span>
                  <span className="block text-xs text-gray-400 truncate">{item.category}</span>
                </div>
                {item.expiresAt && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                      item.expired
                        ? 'bg-red-50 border border-red-300 text-red-700 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.expired
                      ? `Périmé — ${formatDayMonthYear(parseLocalDate(item.expiresAt))}`
                      : `Péremption : ${formatDayMonthYear(parseLocalDate(item.expiresAt))}`}
                  </span>
                )}
                <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                  {formatQuantity(item.quantity)} {item.unit}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="text-gray-400 hover:text-accent p-1"
                  title="Modifier"
                  aria-label={`Modifier le stock de ${item.name}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(item)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Supprimer"
                  aria-label={`Supprimer le stock de ${item.name}`}
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
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Supprimer cette ligne ?"
        message={
          deleting
            ? `Le stock de ${deleting.name} (${formatQuantity(deleting.quantity)} ${deleting.unit}) ne sera plus déduit des courses.`
            : ''
        }
        confirmLabel="Supprimer"
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
