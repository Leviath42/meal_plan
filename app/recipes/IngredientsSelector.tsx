'use client';

import { useState, useEffect } from 'react';

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

  const selectedIngredient = availableIngredients.find(
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
    if (!quantity || parseFloat(quantity) <= 0) {
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
      quantity: parseFloat(quantity) || 1,
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

  const getIngredientName = (ingredientId: string) => {
    const ingredient = availableIngredients.find((i) => i.id === ingredientId);
    return ingredient?.name || 'Ingrédient inconnu';
  };

  return (
    <div className="space-y-4">
      <input
        type="hidden"
        name="ingredients"
        value={JSON.stringify(ingredients)}
      />

      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="font-semibold text-gray-800 mb-3">Ajouter un ingrédient</h3>

        {availableIngredients.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>Aucun ingrédient disponible.</p>
            <p className="text-sm mt-1">
              <a href="/ingredients" className="text-blue-600 hover:underline">
                Ajoutez des ingrédients d'abord
              </a>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Vous pouvez créer une recette sans ingrédients et les ajouter plus tard.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="ingredient" className="block text-sm font-medium text-gray-700 mb-1">
                Ingrédient
              </label>
              <select
                id="ingredient"
                value={selectedIngredientId}
                onChange={(e) => {
                  setSelectedIngredientId(e.target.value);
                  setError(null);
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Sélectionnez un ingrédient...</option>
                {availableIngredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name} ({ingredient.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                Note (optionnel)
              </label>
              <input
                id="note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Ex: coupé en dés, fondu..."
              />
            </div>

            <button
              type="button"
              onClick={addIngredient}
              disabled={!selectedIngredientId || !quantity || parseFloat(quantity) <= 0 || (!unit && !selectedIngredient?.defaultUnit)}
              className="w-full bg-green-600 text-white rounded py-2 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Ajouter l&apos;ingrédient
            </button>
          </div>
        )}
      </div>

      {ingredients.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3">
            Ingrédients ({ingredients.length})
          </h3>
          <ul className="divide-y">
            {ingredients.map((ing, index) => (
              <li key={index} className="py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{getIngredientName(ing.ingredientId)}</p>
                    <p className="text-sm text-gray-500">
                      {ing.quantity} {ing.unit}
                      {ing.note && ` - ${ing.note}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="text-red-600 hover:text-red-800 text-sm underline"
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
