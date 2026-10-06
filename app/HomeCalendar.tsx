'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getMealPlansByDateRange, deleteMealPlan, updateMealPlan } from './actions/meal-plan';
import { useRouter } from 'next/navigation';
import type { MealPlan, MealType, Recipe } from '@/app/types/meal-plan';

interface HomeCalendarProps {
  recipes: Recipe[];
}

// Map des types de repas en français
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner',
};

// Couleurs pour chaque type de repas
const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-orange-100 text-orange-800',
  lunch: 'bg-blue-100 text-blue-800',
  snack: 'bg-green-100 text-green-800',
  dinner: 'bg-purple-100 text-purple-800',
};

// Jours de la semaine en français
const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Modal pour les actions sur un repas planifié
function MealPlanActionsModal({
  isOpen,
  onClose,
  mealPlan,
  recipes,
  onDelete,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  mealPlan: MealPlan | null;
  recipes: Recipe[];
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<MealPlan>) => Promise<void>;
}) {
  const [action, setAction] = useState<'delete' | 'reschedule' | 'edit' | null>(null);
  const [newDate, setNewDate] = useState<string>(mealPlan?.date || '');
  const [newMealType, setNewMealType] = useState<MealType | null>(null);
  const [newRecipeId, setNewRecipeId] = useState<string | null>(null);
  const [newCustomNote, setNewCustomNote] = useState<string | null>(null);
  const [newServings, setNewServings] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !mealPlan) return null;

  const mealTypeOptions: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  const handleDelete = async () => {
    if (!mealPlan) return;
    setIsLoading(true);
    setError(null);
    
    try {
      await onDelete(mealPlan.id);
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
      await onUpdate(mealPlan.id, {
        date: newDate,
        mealType: newMealType || mealPlan.mealType,
      });
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
      const updates: Partial<MealPlan> = {};
      if (newRecipeId !== null) updates.recipeId = newRecipeId;
      if (newCustomNote !== null) updates.customNote = newCustomNote;
      if (newServings !== null) updates.servings = newServings;
      
      await onUpdate(mealPlan.id, updates);
      onClose();
    } catch (err) {
      setError('Impossible de modifier ce repas');
      setIsLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - 1); // Autoriser aujourd'hui et le futur

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg">Actions pour ce repas</h3>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(mealPlan.date).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long'
            })} - {MEAL_TYPE_LABELS[mealPlan.mealType]}
          </p>
        </div>

        <div className="p-4">
          {!action ? (
            <>
              {/* Menu d'actions */}
              <div className="space-y-2">
                <button
                  onClick={() => setAction('edit')}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-blue-600">Modifier</span>
                  <p className="text-sm text-gray-500">Changer la recette, la note ou le nombre de couverts</p>
                </button>
                
                <button
                  onClick={() => setAction('reschedule')}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-blue-600">Replanifier</span>
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
                      onClick={onClose}
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
                      min={minDate.toISOString().split('T')[0]}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de repas *
                    </label>
                    <select
                      value={newMealType || mealPlan.mealType}
                      onChange={(e) => setNewMealType(e.target.value as MealType)}
                      className="w-full p-2 border rounded"
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
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
                      Recette (optionnel)
                    </label>
                    <select
                      value={newRecipeId === null ? '' : (newRecipeId || mealPlan.recipeId || '')}
                      onChange={(e) => setNewRecipeId(e.target.value || null)}
                      className="w-full p-2 border rounded"
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
                      value={newCustomNote === null ? (mealPlan.customNote || '') : newCustomNote}
                      onChange={(e) => setNewCustomNote(e.target.value || null)}
                      placeholder="Ex: Soirée Pizza, Barbecue..."
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de couverts *
                    </label>
                    <input
                      type="number"
                      value={newServings === null ? mealPlan.servings : newServings}
                      onChange={(e) => setNewServings(parseInt(e.target.value) || mealPlan.servings)}
                      min="1"
                      max="20"
                      className="w-full p-2 border rounded"
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
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

// Composant pour afficher un repas dans la grille
export default function HomeCalendar({ recipes = [] }: HomeCalendarProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(new Date());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal pour les actions sur un repas
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);

  // Formater une date en YYYY-MM-DD
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  // Charger les repas planifiés pour la semaine en cours (J à J+6)
  const fetchMealPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const startStr = formatDate(startDate);
      const endStr = formatDate(endDate);

      const result = await getMealPlansByDateRange(startStr, endStr);
      setMealPlans(result);
    } catch (err) {
      console.error('Erreur lors du chargement des repas:', err);
      setError('Impossible de charger les repas planifiés');
    } finally {
      setLoading(false);
    }
  }, [startDate]);

  useEffect(() => {
    fetchMealPlans();
  }, [fetchMealPlans, startDate]);

  // Naviguer vers la semaine suivante/précédente
  const goToNextDay = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 1);
    setStartDate(newDate);
  };

  const goToPreviousDay = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 1);
    setStartDate(newDate);
  };

  const goToToday = () => {
    setStartDate(new Date());
  };

  // Formater la date pour affichage
  const formatShortDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatFullDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getDateString = (date: Date): string => {
    return formatDate(date);
  };

  // Supprimer un repas planifié
  const handleDeleteMealPlan = async (id: string) => {
    try {
      await deleteMealPlan(id);
      setError(null);
      await fetchMealPlans();
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la suppression du repas');
    }
  };

  // Mettre à jour un repas planifié
  const handleUpdateMealPlan = async (id: string, updates: Partial<MealPlan>) => {
    try {
      // Appeler updateMealPlan avec les bonnes données
      const formData = new FormData();
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      await updateMealPlan(id, null, formData);
      setError(null);
      await fetchMealPlans();
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la mise à jour du repas');
    }
  };

  // Ouvrir le modal d'actions pour un repas
  const openActionsModal = (mealPlan: MealPlan) => {
    setSelectedMealPlan(mealPlan);
    setShowActionsModal(true);
  };

  // Récupérer le titre d'une recette
  const getRecipeTitle = (recipeId: string | null): string => {
    if (!recipeId) return '';
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe ? recipe.title : 'Recette inconnue';
  };

  // Vérifier si une date est dans le passé
  const isPastDate = (dateStr: string): boolean => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Générer les jours à afficher (7 jours) - Layout 1-3-3
  const renderDays = () => {
    const currentDate = new Date(startDate);
    
    // Générer les 7 jours
    const daysData = Array.from({ length: 7 }, (_, i) => {
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

    // Helper pour obtenir le texte d'affichage d'un repas
    const getDisplayText = (plan: MealPlan) => {
      return plan.customNote || getRecipeTitle(plan.recipeId) || MEAL_TYPE_LABELS[plan.mealType];
    };

    // Composant pour une ligne de jours (J+1-J+3 ou J+4-J+6) avec alignement par type de repas
    const MealTypeRow = ({ 
      days, 
      mealType, 
    }: { 
      days: typeof daysData;
      mealType: MealType;
    }) => {
      // Vérifier si au moins un jour a ce type de repas
      const hasMealInAnyDay = days.some(day => 
        day.plans.some(p => p.mealType === mealType)
      );
      
      if (!hasMealInAnyDay) return null;

      return (
        <div className="flex gap-3 justify-center">
          {days.map(dayData => {
            const planForType = dayData.plans.find(p => p.mealType === mealType);
            const displayText = planForType ? getDisplayText(planForType) : '';
            
            return (
              <div key={`${dayData.dateStr}-${mealType}`} className="w-[120px] flex justify-center">
                {displayText && (
                  <button
                    onClick={() => openActionsModal(planForType!)}
                    className={`px-2 py-0.5 rounded-full ${MEAL_TYPE_COLORS[mealType]} text-xs truncate text-center max-w-[116px]`}
                    title={`Cliquez pour gérer: ${displayText}`}
                  >
                    {displayText}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="flex flex-col gap-3">
        {/* Ligne 1 : J (aujourd'hui ou date de départ) */}
        <div className="flex justify-center">
          <div className="bg-gray-50 rounded-lg p-2 w-full max-w-xs flex flex-col items-center">
            {/* Jour de la semaine + date */}
            <div className="font-medium text-center mb-1 text-blue-600 text-lg">
              {daysData[0].date.toLocaleDateString('fr-FR', { weekday: 'long' }).toUpperCase()} {daysData[0].date.getDate()}
            </div>
            
            {/* Repas planifiés */}
            <div className="w-full mb-1 min-h-[20px]">
              {daysData[0].plans.length > 0 ? (
                <div className="flex flex-col gap-1 w-full">
                  {daysData[0].plans.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => openActionsModal(plan)}
                      className={`px-2 py-0.5 rounded-full ${MEAL_TYPE_COLORS[plan.mealType]} text-xs truncate text-center w-full`}
                      title={`Cliquez pour gérer: ${getDisplayText(plan)}`}
                    >
                      {getDisplayText(plan)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-4">
                  <span className="text-gray-400 text-xs">Aucun repas</span>
                </div>
              )}
            </div>
            
            {/* Bouton de planification */}
            <button
              onClick={() => router.push('/calendar')}
              className={`w-16 text-xs py-1.5 rounded border transition-colors ${
                daysData[0].isPast 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
              }`}
              disabled={daysData[0].isPast}
              title={daysData[0].isPast ? 'Date dans le passé' : 'Voir le calendrier'}
            >
              Calendrier
            </button>
          </div>
        </div>
        
        {/* Ligne 2 : J+1, J+2, J+3 */}
        <div className="flex flex-col gap-0.5">
          {/* En-têtes des jours */}
          <div className="flex gap-3 justify-center mb-1">
            {daysData.slice(1, 4).map(dayData => (
              <div key={`header-${dayData.dateStr}`} className="w-[120px] text-center text-sm">
                {formatShortDay(dayData.date)}. {dayData.date.getDate()}
              </div>
            ))}
          </div>
          
          {/* Lignes par type de repas (seulement ceux qui ont des repas) */}
          {(['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).map(mealType => (
            <MealTypeRow 
              key={mealType} 
              days={daysData.slice(1, 4)} 
              mealType={mealType}
            />
          ))}
        </div>
        
        {/* Ligne 3 : J+4, J+5, J+6 */}
        <div className="flex flex-col gap-0.5">
          {/* En-têtes des jours */}
          <div className="flex gap-3 justify-center mb-1">
            {daysData.slice(4, 7).map(dayData => (
              <div key={`header-${dayData.dateStr}`} className="w-[120px] text-center text-sm">
                {formatShortDay(dayData.date)}. {dayData.date.getDate()}
              </div>
            ))}
          </div>
          
          {/* Lignes par type de repas (seulement ceux qui ont des repas) */}
          {(['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).map(mealType => (
            <MealTypeRow 
              key={mealType} 
              days={daysData.slice(4, 7)} 
              mealType={mealType}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="w-full max-w-4xl mx-auto mb-8">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-gray-800 capitalize">
            {startDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousDay}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
              disabled={loading}
              title="Jour précédent"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextDay}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
              disabled={loading}
              title="Jour suivant"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          renderDays()
        )}

        <div className="mt-4 flex justify-end">
          <Link
            href="/calendar"
            className="text-sm text-blue-600 hover:underline"
          >
            Voir le calendrier complet →
          </Link>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg bg-red-100 border border-red-300 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Modal d'actions pour un repas */}
      <MealPlanActionsModal
        isOpen={showActionsModal}
        onClose={() => {
          setShowActionsModal(false);
          setSelectedMealPlan(null);
        }}
        mealPlan={selectedMealPlan}
        recipes={recipes}
        onDelete={handleDeleteMealPlan}
        onUpdate={handleUpdateMealPlan}
      />
    </section>
  );
}
