'use client';

import { useState, useEffect } from 'react';
import { quickCreateIngredient } from '@/app/actions/ingredients';
import { formatQuantity } from '@/lib/format';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
}

interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
  note: string | null;
}

// Rayons standards du livre d'ingrédients (mêmes catégories que le seed)
const INGREDIENT_CATEGORIES = [
  'Fruits & Légumes',
  'Boucherie/Volaille',
  'Poissonnerie',
  'Épicerie Salée',
  'Épicerie Sucrée',
  'Produits Laitiers',
  'Boissons',
  'Conserves',
  'Condiments & Sauces',
  'Matières Grasses',
  'Boulangerie',
];

export default function IngredientsSelector({
  availableIngredients,
  existingIngredients = [],
}: {
  availableIngredients: Ingredient[];
  existingIngredients?: RecipeIngredient[];
}) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(existingIngredients);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Création rapide d'ingrédient sans quitter le formulaire de recette
  const [createdIngredients, setCreatedIngredients] = useState<Ingredient[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(INGREDIENT_CATEGORIES[0]);
  const [newUnit, setNewUnit] = useState('pièce');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Les ingrédients créés pendant la saisie s'ajoutent à la sélection
  const allIngredients = [...availableIngredients, ...createdIngredients];

  const selectedIngredient = allIngredients.find(
    (i) => i.id === selectedIngredientId
  );

  // Mettre à jour l'unité quand on change d'ingrédient
  useEffect(() => {
    if (selectedIngredient) {
      setUnit(selectedIngredient.defaultUnit);
    } else {
      setUnit('');
    }
  }, [selectedIngredient]);

  const addIngredient = () => {
    if (!selectedIngredientId) {
      setError('Veuillez sélectionner un ingrédient');
      return;
    }
    const parsedQuantity = Number.parseFloat(quantity);
    if (!quantity || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setError('Veuillez indiquer une quantité valide');
      return;
    }
    if (!unit && !selectedIngredient?.defaultUnit) {
      setError('Veuillez indiquer une unité');
      return;
    }

    setError(null);

    const newIngredient: RecipeIngredient = {
      ingredientId: selectedIngredientId,
      quantity: parsedQuantity,
      unit: unit || selectedIngredient?.defaultUnit || 'unité',
      note: note || null,
    };

    setIngredients([...ingredients, newIngredient]);

    // Reset form
    setSelectedIngredientId('');
    setQuantity('1');
    setUnit('');
    setNote('');
  };

  const removeIngredient = (index: number) => {
    const newIngredients = [...ingredients];
    newIngredients.splice(index, 1);
    setIngredients(newIngredients);
  };

  const handleQuickCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const result = await quickCreateIngredient(newName, newCategory, newUnit);
      if (result.success && result.ingredient) {
        const created = result.ingredient;
        setCreatedIngredients((prev) => [...prev, created]);
        setSelectedIngredientId(created.id);
        setNewName('');
        setNewUnit('pièce');
        setShowCreateForm(false);
        setError(null);
      } else {
        setCreateError(result.message ?? 'Création impossible');
      }
    } catch {
      setCreateError("Une erreur est survenue lors de la création de l'ingrédient");
    } finally {
      setCreating(false);
    }
  };

  const getIngredientName = (ingredientId: string) => {
    const ingredient = allIngredients.find((i) => i.id === ingredientId);
    return ingredient?.name || 'Ingrédient inconnu';
  };

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="ingredients"
        value={JSON.stringify(ingredients)}
      />

      <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
        <div className="flex justify-between items-center gap-2 mb-2">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800">Ajouter un ingrédient</h3>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((open) => !open);
              setCreateError(null);
            }}
            className="text-xs sm:text-sm text-accent hover:underline whitespace-nowrap"
          >
            {showCreateForm ? 'Annuler' : '+ Nouvel ingrédient'}
          </button>
        </div>

        {/* Création rapide d'un ingrédient */}
        {showCreateForm && (
          <div className="mb-3 p-2 sm:p-3 border border-gray-300 rounded bg-white space-y-2">
            {createError && (
              <p className="text-red-600 text-xs">{createError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label htmlFor="new-ingredient-name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  id="new-ingredient-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Piment d'Espelette"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="new-ingredient-category" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Rayon
                </label>
                <select
                  id="new-ingredient-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {INGREDIENT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="new-ingredient-unit" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Unité par défaut
              </label>
              <input
                id="new-ingredient-unit"
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="Ex: pièce, g, ml"
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              type="button"
              onClick={handleQuickCreate}
              disabled={creating || !newName.trim() || !newUnit.trim()}
              className="w-full bg-accent text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Création…' : 'Créer l\'ingrédient'}
            </button>
            <p className="text-xs text-gray-500">
              L'ingrédient créé est directement sélectionné dans la liste ci-dessous.
            </p>
          </div>
        )}

        {allIngredients.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-xs sm:text-sm text-gray-500">Aucun ingrédient disponible.</p>
            <p className="text-xs text-gray-400 mt-1">
              Utilisez « + Nouvel ingrédient » pour en créer un sans quitter la recette.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="ingredient" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Ingrédient
              </label>
              <select
                id="ingredient"
                value={selectedIngredientId}
                onChange={(e) => {
                  setSelectedIngredientId(e.target.value);
                  setError(null);
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Sélectionnez un ingrédient...</option>
                {allIngredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name} ({ingredient.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label htmlFor="quantity" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Quantité
                </label>
                <input
                  id="quantity"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setError(null);
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="unit" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Unité
                </label>
                <input
                  id="unit"
                  type="text"
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    setError(null);
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="note" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Note (optionnel)
              </label>
              <input
                id="note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Ex: coupé en dés, fondu..."
              />
            </div>

            <button
              type="button"
              onClick={addIngredient}
              disabled={!selectedIngredientId || !quantity || Number.isNaN(Number.parseFloat(quantity)) || Number.parseFloat(quantity) <= 0 || (!unit && !selectedIngredient?.defaultUnit)}
              className="w-full bg-green-600 text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Ajouter l'ingrédient
            </button>
          </div>
        )}
      </div>

      {ingredients.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2">
            Ingrédients ({ingredients.length})
          </h3>
          <ul className="divide-y divide-gray-200">
            {ingredients.map((ing, index) => (
              <li key={index} className="py-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">{getIngredientName(ing.ingredientId)}</p>
                    <p className="text-xs text-gray-500">
                      {formatQuantity(ing.quantity)} {ing.unit}
                      {ing.note && ` - ${ing.note}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="text-red-600 hover:text-red-800 text-xs underline whitespace-nowrap"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
