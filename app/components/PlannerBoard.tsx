'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { getMealPlans, addMealPlan, deleteMealPlan, updateMealPlan } from '@/app/actions/meal-plan';
import type { MealPlan, MealType, Recipe } from '@/app/types/meal-plan';

interface PlannerBoardProps {
  recipes: Recipe[];
  // Nombre de jours affichés à partir de la date de départ (7 pour l'accueil, 19 pour le calendrier)
  daysCount?: number;
  // Contenu optionnel affiché sous la grille (ex: lien vers le calendrier complet)
  footer?: ReactNode;
  // Afficher la navigation par mois en plus de la navigation par jour (page calendrier)
  enableMonthNavigation?: boolean;
}

// Données d'un jour affiché dans la grille
interface DayData {
  date: Date;
  dateStr: string;
  isToday: boolean;
  isPast: boolean;
  plans: MealPlan[];
}

// Formater une Date en YYYY-MM-DD selon le fuseau local.
// toISOString() formaterait en UTC : minuit local (UTC+2) deviendrait la veille.
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

// Noms des types de repas en français
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Petit-déj',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner',
};

// Couleurs pour chaque type de repas
const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-orange-100 text-orange-800',
  // Couleur de catégorie (pas l'accent UI) : le Déjeuner reste bleu
  lunch: 'bg-blue-100 text-blue-800',
  snack: 'bg-green-100 text-green-800',
  dinner: 'bg-purple-100 text-purple-800',
};

// Ordre chronologique des types de repas
const MEAL_TYPE_ORDER: string[] = ['breakfast', 'lunch', 'snack', 'dinner'];

// Types de plats pour l'ordre chronologique dans un repas
const MEAL_COURSE_ORDER: string[] = ['apéritif', 'entrée', 'plat', 'accompagnement', 'dessert', 'boisson'];

// ID de la zone de suppression (fixe en bas de l'écran pendant un drag)
const DELETE_ZONE_ID = 'delete-meal-zone';

// Badge de repas draggable : glisser pour replanifier/supprimer, cliquer pour gérer
function DraggableMealBadge({
  plan,
  displayText,
  badgeTitle,
  badgeSuffix,
  badgeClass,
  onClick,
}: {
  plan: MealPlan;
  displayText: string;
  badgeClass: string;
  onClick: () => void;
  badgeTitle: string;
  badgeSuffix?: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: plan.id,
    data: { plan },
  });

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`${badgeClass} ${isDragging ? 'opacity-30' : ''} cursor-grab active:cursor-grabbing touch-none`}
      title={badgeTitle}
    >
      {displayText}
      {badgeSuffix}
    </button>
  );
}

// Zone de dépôt pour un jour (date seule) ou une cellule jour + type de repas
function DroppableDayZone({
  dropId,
  dropDate,
  dropMealType,
  disabled = false,
  className = '',
  children,
}: {
  dropId: string;
  dropDate: string;
  dropMealType?: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    disabled,
    data: { date: dropDate, mealType: dropMealType },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${!disabled && isOver ? 'ring-2 ring-accent rounded-lg bg-accent-soft' : ''}`}
    >
      {children}
    </div>
  );
}

// Zone de suppression fixe en bas de l'écran, visible uniquement pendant un drag
function DeleteDropZone({ label }: { label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: DELETE_ZONE_ID });

  return (
    <div ref={setNodeRef} className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-4 pointer-events-none">
      <div
        className={`flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg border-2 font-medium transition-transform ${
          isOver
            ? 'bg-red-600 border-red-700 text-white scale-105'
            : 'bg-red-500 border-red-600 text-white'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span className="text-sm">
          {isOver ? `Relâchez pour supprimer « ${label} »` : `Supprimer « ${label} »`}
        </span>
      </div>
    </div>
  );
}

// Modal pour la création d'un repas planifié
function MealPlanCreationModal({
  isOpen,
  onClose,
  date,
  recipes,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  recipes: Recipe[];
  onCreate: (data: { date: string; mealType: MealType; recipeId?: string | null; customNote?: string | null; servings: number }) => Promise<void>;
}) {
  const [mealType, setMealType] = useState<MealType | ''>('dinner');
  const [recipeId, setRecipeId] = useState<string | ''>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [servings, setServings] = useState<string>('4');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialiser les états quand le modal s'ouvre ou se ferme
  useEffect(() => {
    if (!isOpen) {
      // Réinitialiser tous les champs quand on ferme (type par défaut : Dîner)
      setMealType('dinner');
      setRecipeId('');
      setCustomNote('');
      setServings('4');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  const dateObj = parseLocalDate(date);
  const isPastDate = dateObj < minDate;

  const handleSubmit = async () => {
    if (!mealType) {
      setError('Le type de repas est requis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCreate({
        date,
        mealType: mealType as MealType,
        recipeId: recipeId || null,
        customNote: customNote || null,
        servings: parseInt(servings, 10) || 4,
      });

      // Réinitialiser le formulaire
      setMealType('dinner');
      setRecipeId('');
      setCustomNote('');
      setServings('4');
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Impossible de créer ce repas planifié');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setMealType('dinner');
    setRecipeId('');
    setCustomNote('');
    setServings('4');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg">Créer un repas planifié</h3>
          <p className="text-sm text-gray-600 mt-1">
            {parseLocalDate(date).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long'
            })}
          </p>
        </div>

        <div className="p-4 space-y-4">
          {isPastDate ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Impossible de planifier un repas dans le passé.</p>
              <button
                onClick={handleCancel}
                className="mt-4 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          ) : (
            <>
              {/* Type de repas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de repas *
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType | '')}
                  className="w-full p-2 border rounded bg-white text-gray-800"
                >
                  {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(type => (
                    <option key={type} value={type}>
                      {MEAL_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recette */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recette (optionnel)
                </label>
                <select
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  className="w-full p-2 border rounded bg-white text-gray-800"
                  disabled={!mealType}
                >
                  <option value="">-- Aucune recette --</option>
                  {recipes.map(recipe => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note personnalisée */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note personnalisée (optionnel)
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Ex: Soirée Pizza, Barbecue..."
                  className="w-full p-2 border rounded bg-white text-gray-800"
                />
              </div>

              {/* Nombre de couverts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de couverts *
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  min="1"
                  max="20"
                  className="w-full p-2 border rounded bg-white text-gray-800"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
                  disabled={isLoading || !mealType}
                >
                  {isLoading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal pour les actions sur un repas planifié
function MealPlanActionsModal({
  isOpen,
  onClose,
  mealPlan,
  recipes,
  onDelete,
  onUpdate,
  onRefresh,
}: {
  isOpen: boolean;
  onClose: () => void;
  mealPlan: MealPlan | null;
  recipes: Recipe[];
  onDelete: (id: string) => Promise<string | null>;
  onUpdate: (id: string, updates: Partial<MealPlan>) => Promise<string | null>;
  onRefresh: () => Promise<void>;
}) {
  const [action, setAction] = useState<'delete' | 'reschedule' | 'edit' | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [newMealType, setNewMealType] = useState<MealType | null>(null);
  const [newRecipeId, setNewRecipeId] = useState<string | null>(null);
  const [newCustomNote, setNewCustomNote] = useState<string>('');
  const [newServings, setNewServings] = useState<string>('4');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialiser les états quand le modal s'ouvre ou quand mealPlan change
  useEffect(() => {
    if (isOpen && mealPlan) {
      setNewDate(mealPlan.date);
      setNewMealType(null);
      setNewRecipeId(null);
      setNewCustomNote('');
      setNewServings('4');
      setAction(null);
      setError(null);
      setIsLoading(false);
    } else if (!isOpen) {
      // Réinitialiser aussi quand on ferme le modal
      setAction(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, mealPlan]);

  if (!isOpen || !mealPlan) return null;

  const mealTypeOptions: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  const handleDelete = async () => {
    if (!mealPlan) return;
    setIsLoading(true);
    setError(null);

    try {
      const errorMsg = await onDelete(mealPlan.id);
      if (errorMsg) {
        setError(errorMsg);
        setIsLoading(false);
        return;
      }
      await onRefresh();
      onClose();
    } catch (err) {
      setError('Impossible de supprimer ce repas planifié');
      setIsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!mealPlan || !newDate) return;
    setIsLoading(true);
    setError(null);

    try {
      const errorMsg = await onUpdate(mealPlan.id, {
        date: newDate,
        mealType: newMealType || mealPlan.mealType,
      });
      if (errorMsg) {
        setError(errorMsg);
        setIsLoading(false);
        return;
      }
      await onRefresh();
      onClose();
    } catch (err) {
      setError('Impossible de replanifier ce repas');
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!mealPlan) return;
    setIsLoading(true);
    setError(null);

    try {
      const updates: Partial<MealPlan> = {
        recipeId: newRecipeId,
        customNote: newCustomNote || null,
        servings: parseInt(newServings, 10) || 4,
        mealType: newMealType || mealPlan.mealType,
      };

      const errorMsg = await onUpdate(mealPlan.id, updates);
      if (errorMsg) {
        setError(errorMsg);
        setIsLoading(false);
        return;
      }
      await onRefresh();
      onClose();
    } catch (err) {
      setError('Impossible de modifier ce repas');
      setIsLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);

  // Récupérer le titre de la recette
  const getRecipeTitle = (recipeId: string | null): string => {
    if (!recipeId) return '';
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe ? recipe.title : 'Recette inconnue';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg">Actions pour ce repas</h3>
          <p className="text-sm text-gray-600 mt-1">
            {parseLocalDate(mealPlan.date).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long'
            })} - {MEAL_TYPE_LABELS[mealPlan.mealType]}
          </p>
        </div>

        <div className="p-4">
          {!action ? (
            <>
              {/* Informations sur le repas */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Informations du repas</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-500">Type: </span>
                    <span className="font-medium">{MEAL_TYPE_LABELS[mealPlan.mealType]}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Recette: </span>
                    <span className="font-medium">{mealPlan.customNote || getRecipeTitle(mealPlan.recipeId) || 'Aucune'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Couverts: </span>
                    <span className="font-medium">{mealPlan.servings}</span>
                  </div>
                  {mealPlan.mealCourse && (
                    <div>
                      <span className="text-gray-500">Type de plat: </span>
                      <span className="font-medium">{mealPlan.mealCourse}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Menu d'actions */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setNewRecipeId(mealPlan.recipeId);
                    setNewCustomNote(mealPlan.customNote ?? '');
                    setNewServings(String(mealPlan.servings ?? 4));
                    setNewMealType(mealPlan.mealType as MealType);
                    setAction('edit');
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-accent">Modifier</span>
                  <p className="text-sm text-gray-500">Changer le type, la recette, la note ou le nombre de couverts</p>
                </button>

                <button
                  onClick={() => {
                    setNewDate(mealPlan.date);
                    setNewMealType(null);
                    setAction('reschedule');
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-accent">Replanifier</span>
                  <p className="text-sm text-gray-500">Changer la date ou le type de repas</p>
                </button>

                <button
                  onClick={() => setAction('delete')}
                  className="w-full text-left p-3 hover:bg-gray-50"
                >
                  <span className="font-medium text-red-600">Supprimer</span>
                  <p className="text-sm text-gray-500">Retirer ce repas du calendrier</p>
                </button>
              </div>

              <div className="mt-4">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmation de suppression */}
              {action === 'delete' && (
                <div className="text-center">
                  <p className="text-gray-700 mb-4">
                    Êtes-vous sûr de vouloir supprimer ce repas ?
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setAction(null);
                        setError(null);
                      }}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                      disabled={isLoading}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulaire de replanification */}
              {action === 'reschedule' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nouvelle date *
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      min={toLocalDateStr(minDate)}
                      className="w-full p-2 border rounded bg-white text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de repas *
                    </label>
                    <select
                      value={newMealType || mealPlan?.mealType}
                      onChange={(e) => setNewMealType(e.target.value as MealType)}
                      className="w-full p-2 border rounded bg-white text-gray-800"
                    >
                      {mealTypeOptions.map(type => (
                        <option key={type} value={type}>
                          {MEAL_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setAction(null);
                        setError(null);
                      }}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                      disabled={isLoading}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleReschedule}
                      className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
                      disabled={isLoading || !newDate}
                    >
                      {isLoading ? 'Replanification...' : 'Replanifier'}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulaire d'édition */}
              {action === 'edit' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de repas *
                    </label>
                    <select
                      value={newMealType || mealPlan?.mealType}
                      onChange={(e) => setNewMealType(e.target.value as MealType)}
                      className="w-full p-2 border rounded bg-white text-gray-800"
                    >
                      {mealTypeOptions.map(type => (
                        <option key={type} value={type}>
                          {MEAL_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recette (optionnel)
                    </label>
                    <select
                      value={newRecipeId ?? ''}
                      onChange={(e) => setNewRecipeId(e.target.value || null)}
                      className="w-full p-2 border rounded bg-white text-gray-800"
                    >
                      <option value="">-- Aucune recette --</option>
                      {recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note personnalisée (optionnel)
                    </label>
                    <input
                      type="text"
                      value={newCustomNote}
                      onChange={(e) => setNewCustomNote(e.target.value)}
                      placeholder="Ex: Soirée Pizza, Barbecue..."
                      className="w-full p-2 border rounded bg-white text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de couverts *
                    </label>
                    <input
                      type="number"
                      value={newServings}
                      onChange={(e) => setNewServings(e.target.value)}
                      min="1"
                      max="20"
                      className="w-full p-2 border rounded bg-white text-gray-800"
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setAction(null);
                        setError(null);
                      }}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                      disabled={isLoading}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleEdit}
                      className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Modification...' : 'Modifier'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant principal : calendrier de planification réutilisable
// (page d'accueil : 7 jours en 1-3-3 ; page calendrier : 19 jours en 1-3-3-3-3-3-3)
export default function PlannerBoard({ recipes = [], daysCount = 7, footer, enableMonthNavigation = false }: PlannerBoardProps) {
  const [startDate, setStartDate] = useState(new Date());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Le bandeau d'erreur se ferme tout seul apres 6 secondes
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  // Modal pour la création
  const [selectedDateForCreation, setSelectedDateForCreation] = useState<string | null>(null);
  const [showCreationModal, setShowCreationModal] = useState(false);

  // Modal pour les actions sur un repas
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);

  // Repas en cours de drag & drop
  const [activeDragPlan, setActiveDragPlan] = useState<MealPlan | null>(null);
  // Clic vs drag : le drag démarre après 6px de mouvement, le clic ouvre toujours le modal
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Formater une date en YYYY-MM-DD (fuseau local)
  const formatDate = (date: Date): string => toLocalDateStr(date);

  // Charger les repas planifiés pour la période affichée (J à J+daysCount-1)
  const fetchMealPlans = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + daysCount - 1);

      const startStr = formatDate(startDate);
      const endStr = formatDate(endDate);

      const result = await getMealPlans(startStr, endStr);
      setMealPlans(result.mealPlans);
    } catch (err) {
      console.error('Erreur lors du chargement des repas:', err);
      setError('Impossible de charger les repas planifiés');
    } finally {
      setLoading(false);
    }
  }, [startDate, daysCount]);

  useEffect(() => {
    fetchMealPlans();
  }, [fetchMealPlans, startDate]);

  // Navigation : jour suivant
  const goToNextDay = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 1);
    setStartDate(newDate);
  };

  // Navigation : jour précédent
  const goToPreviousDay = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 1);
    setStartDate(newDate);
  };

  // Navigation : retourner à aujourd'hui
  const goToToday = () => {
    setStartDate(new Date());
  };

  // Navigation : afficher une date en première position (clic sur un en-tête de date)
  const goToDate = (dateStr: string) => {
    setStartDate(parseLocalDate(dateStr));
  };

  // Navigation : mois précédent, calculé depuis la date affichée en premier
  // (le jour est conservé, ramené au dernier jour du mois cible si nécessaire)
  const goToPreviousMonth = () => {
    const newDate = new Date(startDate);
    const day = newDate.getDate();
    newDate.setDate(1);
    newDate.setMonth(newDate.getMonth() - 1);
    newDate.setDate(Math.min(day, new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate()));
    setStartDate(newDate);
  };

  // Navigation : mois suivant, calculé depuis la date affichée en premier
  const goToNextMonth = () => {
    const newDate = new Date(startDate);
    const day = newDate.getDate();
    newDate.setDate(1);
    newDate.setMonth(newDate.getMonth() + 1);
    newDate.setDate(Math.min(day, new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate()));
    setStartDate(newDate);
  };

  // Formatage des dates
  const getDateString = (date: Date): string => {
    return formatDate(date);
  };

  // Ouvrir le modal de création pour une date
  const openCreationModal = (dateStr: string) => {
    setSelectedDateForCreation(dateStr);
    setShowCreationModal(true);
  };

  // Ouvrir le modal d'actions pour un repas
  const openActionsModal = (mealPlan: MealPlan) => {
    setSelectedMealPlan(mealPlan);
    setShowActionsModal(true);
  };

  // Créer un repas planifié
  const handleCreateMealPlan = async (data: {
    date: string;
    mealType: MealType;
    recipeId?: string | null;
    customNote?: string | null;
    servings: number
  }) => {
    try {
      const formData = new FormData();
      formData.append('date', data.date);
      formData.append('mealType', data.mealType);
      if (data.recipeId) formData.append('recipeId', data.recipeId);
      if (data.customNote) formData.append('customNote', data.customNote);
      formData.append('servings', data.servings.toString());

      const result = await addMealPlan(null, formData);
      if (result && result.success === false) {
        const message = result.message || 'Erreur lors de la création du repas';
        setError(message);
        throw new Error(message);
      }
      await fetchMealPlans();
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error && err.message ? err.message : 'Erreur lors de la création du repas');
      throw err;
    }
  };

  // Supprimer un repas planifié
  // Retourne un message d'erreur en cas d'échec, null en cas de succès
  const handleDeleteMealPlan = async (id: string): Promise<string | null> => {
    try {
      const result = await deleteMealPlan(id);
      if (result.error) {
        setError(result.error);
        return result.error;
      }
      await fetchMealPlans();
      setError(null);
      return null;
    } catch (err) {
      console.error('Erreur:', err);
      const message = 'Erreur lors de la suppression du repas';
      setError(message);
      return message;
    }
  };

  // Mettre à jour un repas planifié
  // Retourne un message d'erreur en cas d'échec, null en cas de succès
  const handleUpdateMealPlan = async (id: string, updates: Partial<MealPlan>): Promise<string | null> => {
    try {
      const formData = new FormData();
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value === null ? '' : String(value));
        }
      });

      const result = await updateMealPlan(id, null, formData);
      if (result?.errors && Object.keys(result.errors).length > 0) {
        const message = result.errors.general?.[0] || 'Erreur lors de la mise à jour du repas';
        setError(message);
        return message;
      }
      await fetchMealPlans();
      setError(null);
      return null;
    } catch (err) {
      console.error('Erreur:', err);
      const message = 'Erreur lors de la mise à jour du repas';
      setError(message);
      return message;
    }
  };

  // Récupérer le titre d'une recette
  const getRecipeTitle = (recipeId: string | null): string => {
    if (!recipeId) return '';
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe ? recipe.title : 'Recette inconnue';
  };

  // Texte affiché pour un repas planifié (note, recette ou type de repas)
  const getPlanDisplayText = (plan: MealPlan): string =>
    plan.customNote || getRecipeTitle(plan.recipeId) || MEAL_TYPE_LABELS[plan.mealType as MealType];

  // Info-bulle d'un badge : temps de préparation/cuisson de la recette si renseignés
  const getBadgeTooltip = (plan: MealPlan): string => {
    const recipe = plan.recipeId ? recipes.find(r => r.id === plan.recipeId) : undefined;
    if (!recipe) {
      return `Glissez pour replanifier ou supprimer, cliquez pour gérer : ${getPlanDisplayText(plan)}`;
    }
    const times: string[] = [];
    if (recipe.prepTime && recipe.prepTime > 0) times.push(`préparation ${recipe.prepTime} min`);
    if (recipe.cookTime && recipe.cookTime > 0) times.push(`cuisson ${recipe.cookTime} min`);
    return times.length > 0 ? `${recipe.title} — ${times.join(', ')}` : recipe.title;
  };

  // Suffixe gris discret sous le texte du badge : type de plat hérité de la recette
  const getBadgeCourseSuffix = (plan: MealPlan): ReactNode =>
    plan.mealCourse ? (
      <span className="ml-1 text-[10px] font-normal opacity-70">{plan.mealCourse}</span>
    ) : null;

  // Début du drag : mémoriser le repas déplacé
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragPlan((event.active.data.current?.plan as MealPlan) ?? null);
  };

  const handleDragCancel = () => setActiveDragPlan(null);

  // Fin du drag : replanifier vers la zone de dépôt ou supprimer
  const handleDragEnd = async (event: DragEndEvent) => {
    const plan = event.active.data.current?.plan as MealPlan | undefined;
    const over = event.over;
    setActiveDragPlan(null);

    if (!plan || !over) return;

    // Dépôt sur la zone de suppression
    if (over.id === DELETE_ZONE_ID) {
      await handleDeleteMealPlan(plan.id);
      return;
    }

    const overData = over.data.current as { date?: string; mealType?: string } | undefined;
    if (!overData?.date) return;

    const targetDate = overData.date;
    const targetMealType = overData.mealType || plan.mealType;

    // Pas de replanification vers une date passée
    if (targetDate < formatDate(new Date())) {
      setError('Impossible de replanifier un repas dans le passé');
      return;
    }

    // Rien ne change : pas d'appel serveur
    if (targetDate === plan.date && targetMealType === plan.mealType) return;

    await handleUpdateMealPlan(plan.id, { date: targetDate, mealType: targetMealType });
  };

  // Trier les repas par ordre chronologique (type de repas puis type de plat)
  const sortPlans = (plans: MealPlan[]): MealPlan[] => [...plans].sort((a, b) => {
    const mealTypeOrderA = MEAL_TYPE_ORDER.indexOf(a.mealType as MealType);
    const mealTypeOrderB = MEAL_TYPE_ORDER.indexOf(b.mealType as MealType);

    if (mealTypeOrderA !== mealTypeOrderB) {
      return mealTypeOrderA - mealTypeOrderB;
    }

    const courseOrderA = MEAL_COURSE_ORDER.indexOf(a.mealCourse || '');
    const courseOrderB = MEAL_COURSE_ORDER.indexOf(b.mealCourse || '');

    if (courseOrderA !== courseOrderB) {
      return courseOrderA - courseOrderB;
    }

    return a.id.localeCompare(b.id);
  });

  // Rendu de la carte du jour principal
  // (fonction de rendu appelée directement : évite un remontage du sous-arbre
  // à chaque re-render, qui détruirait le nœud en cours de drag)
  const renderMainDayCard = (mainDay: DayData) => (
    <DroppableDayZone
      dropId={`day-card:${mainDay.dateStr}`}
      dropDate={mainDay.dateStr}
      disabled={mainDay.isPast}
      className="flex flex-col items-center p-1.5 bg-gray-50 rounded-lg w-full max-w-xs"
    >
      {/* Jour de la semaine + date, avec navigation par jour */}
      <div className="flex items-center justify-center gap-1 mb-1">
        <button
          onClick={goToPreviousDay}
          className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
          disabled={loading}
          title="Jour précédent"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className={`font-medium text-center ${mainDay.isToday ? 'text-accent' : 'text-gray-800'} text-lg font-bold`}>
          {mainDay.date.toLocaleDateString('fr-FR', { weekday: 'long' }).toUpperCase()} {mainDay.date.getDate()}
        </span>
        <button
          onClick={goToNextDay}
          className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
          disabled={loading}
          title="Jour suivant"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Repas planifiés */}
      <div className="w-full mb-1 min-h-[20px]">
        {mainDay.plans.length === 0 ? (
          <div className="flex items-center justify-center h-4">
            <span className="text-gray-400 text-sm">Aucun repas</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1 w-full">
            {sortPlans(mainDay.plans).map(plan => (
              <DraggableMealBadge
                key={plan.id}
                plan={plan}
                displayText={getPlanDisplayText(plan)}
                badgeClass={`px-2 py-0.5 rounded-full ${MEAL_TYPE_COLORS[plan.mealType as MealType]} text-sm truncate text-center w-full text-left`}
                badgeTitle={getBadgeTooltip(plan)}
                badgeSuffix={getBadgeCourseSuffix(plan)}
                onClick={() => openActionsModal(plan)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bouton de planification (+) */}
      <button
        onClick={() => openCreationModal(mainDay.dateStr)}
        className={`w-14 text-xs py-1 rounded border transition-colors ${
          mainDay.isPast
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-accent text-white hover:bg-accent-hover border-accent'
        }`}
        disabled={mainDay.isPast}
        title={mainDay.isPast ? 'Date dans le passé' : 'Ajouter un repas'}
      >
        +
      </button>
    </DroppableDayZone>
  );

  // Générer les jours à afficher - Layout 1 puis lignes de 3 (1-3-3 pour 7 jours, 1-3-3-3-3 pour 13 jours)
  const renderDays = () => {
    const currentDate = new Date(startDate);

    const daysData = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      const dateStr = getDateString(date);
      return {
        date,
        dateStr,
        isToday: dateStr === getDateString(new Date()),
        isPast: date < new Date(new Date().setHours(0, 0, 0, 0)),
        plans: mealPlans.filter(mp => mp.date === dateStr)
      };
    });

    // Helper pour formater le jour court avec majuscules
    const formatShortDay = (date: Date) => {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase().replace('.', '');
    };

    // Découper les jours suivants en lignes de 3 jours
    const restRows: (typeof daysData)[] = [];
    for (let i = 1; i < daysData.length; i += 3) {
      restRows.push(daysData.slice(i, i + 3));
    }

    return (
      <div className="flex flex-col gap-2">
        {/* Ligne 1 : jour principal */}
        <div className="flex justify-center">
          {renderMainDayCard(daysData[0])}
        </div>

        {/* Lignes suivantes : 3 jours par ligne */}
        {restRows.map(rowDays => (
          <div key={`row-${rowDays[0].dateStr}`} className="flex flex-col gap-0.5">
            {/* En-têtes des jours (cliquables : la date devient la première affichée) */}
            <div className="flex gap-3 justify-center mb-1">
              {rowDays.map(dayData => (
                <DroppableDayZone
                  key={`header-${dayData.dateStr}`}
                  dropId={`header:${dayData.dateStr}`}
                  dropDate={dayData.dateStr}
                  disabled={dayData.isPast}
                  className="w-[92px] text-center text-sm"
                >
                  <button
                    onClick={() => goToDate(dayData.dateStr)}
                    className="w-full rounded hover:bg-gray-100 hover:text-accent transition-colors cursor-pointer"
                    title="Afficher cette date en première position"
                  >
                    {formatShortDay(dayData.date)}. {dayData.date.getDate()}
                  </button>
                </DroppableDayZone>
              ))}
            </div>

            {/* Lignes par type de repas (seulement ceux qui ont des repas) */}
            {MEAL_TYPE_ORDER.map(mealType => {
              const hasMealInAnyDay = rowDays.some(day =>
                day.plans.some(p => p.mealType === mealType)
              );

              if (!hasMealInAnyDay) return null;

              return (
                <div key={mealType} className="flex gap-3 justify-center">
                  {rowDays.map(dayData => {
                    const plansForType = dayData.plans.filter(p => p.mealType === mealType);

                    return (
                      <DroppableDayZone
                        key={`${dayData.dateStr}-${mealType}`}
                        dropId={`cell:${dayData.dateStr}:${mealType}`}
                        dropDate={dayData.dateStr}
                        dropMealType={mealType}
                        disabled={dayData.isPast}
                        className="w-[92px] flex flex-col items-center gap-1"
                      >
                        {plansForType.map(plan => (
                          <DraggableMealBadge
                            key={plan.id}
                            plan={plan}
                            displayText={getPlanDisplayText(plan)}
                            badgeClass={`px-2 py-0.5 rounded-full ${MEAL_TYPE_COLORS[mealType as MealType]} text-xs truncate text-center max-w-[88px]`}
                            badgeTitle={getBadgeTooltip(plan)}
                            badgeSuffix={getBadgeCourseSuffix(plan)}
                            onClick={() => openActionsModal(plan)}
                          />
                        ))}
                        {plansForType.length === 0 && activeDragPlan && !dayData.isPast && (
                          <div className="w-full h-5 border-2 border-dashed border-gray-300 rounded-full" />
                        )}
                      </DroppableDayZone>
                    );
                  })}
                </div>
              );
            })}

            {/* Boutons + sous chaque colonne */}
            <div className="flex gap-3 justify-center">
              {rowDays.map(dayData => (
                <div key={`plus-${dayData.dateStr}`} className="w-[92px] flex justify-center">
                  <button
                    onClick={() => openCreationModal(dayData.dateStr)}
                    className={`w-14 text-xs py-1 rounded border transition-colors ${
                      dayData.isPast
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                        : 'bg-accent text-white hover:bg-accent-hover border-accent'
                    }`}
                    disabled={dayData.isPast}
                    title={dayData.isPast ? 'Date dans le passé' : 'Ajouter un repas'}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
    <section className="w-full max-w-4xl mx-auto mb-3">
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 capitalize">
              {startDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            {enableMonthNavigation && (
              <div className="flex gap-1.5">
                <button
                  onClick={goToPreviousMonth}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                  disabled={loading}
                  title="Mois précédent"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M20 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                  disabled={loading}
                  title="Mois suivant"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M4 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1 bg-accent text-white rounded hover:bg-accent-hover text-xs"
          >
            Aujourd'hui
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">Chargement...</div>
        ) : (
          renderDays()
        )}

        {footer && (
          <div className="mt-2 flex justify-end">
            {footer}
          </div>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg bg-red-100 border border-red-300 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Modal de création */}
      {showCreationModal && selectedDateForCreation && (
        <MealPlanCreationModal
          key={selectedDateForCreation}
          isOpen={showCreationModal && !!selectedDateForCreation}
          onClose={() => {
            setShowCreationModal(false);
            setSelectedDateForCreation(null);
          }}
          date={selectedDateForCreation || ''}
          recipes={recipes}
          onCreate={handleCreateMealPlan}
        />
      )}

      {/* Modal d'actions pour un repas */}
      {showActionsModal && selectedMealPlan && (
        <MealPlanActionsModal
          key={selectedMealPlan.id}
          isOpen={showActionsModal}
          onClose={() => {
            setShowActionsModal(false);
            setSelectedMealPlan(null);
          }}
          mealPlan={selectedMealPlan}
          recipes={recipes}
          onDelete={handleDeleteMealPlan}
          onUpdate={handleUpdateMealPlan}
          onRefresh={fetchMealPlans}
        />
      )}
    </section>

    {/* Zone de suppression : n'apparaît que pendant un drag */}
    {activeDragPlan && <DeleteDropZone label={getPlanDisplayText(activeDragPlan)} />}

    {/* Badge flottant qui suit le pointeur pendant le drag */}
    <DragOverlay dropAnimation={null}>
      {activeDragPlan && (
        <div
          className={`px-2 py-0.5 rounded-full ${MEAL_TYPE_COLORS[activeDragPlan.mealType]} text-xs truncate shadow-lg border border-gray-300 cursor-grabbing`}
        >
          {getPlanDisplayText(activeDragPlan)}
        </div>
      )}
    </DragOverlay>
    </DndContext>
  );
}
