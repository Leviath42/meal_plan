'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMealPlans, addMealPlan, deleteMealPlan, MealPlanFormState, MealType } from './actions/meal-plan';
import { useRouter } from 'next/navigation';
import type { JSX } from 'react';

interface MealPlan {
  id: string;
  date: string;
  mealType: string;
  recipeId: string | null;
  customNote: string | null;
  servings: number | null;
}

interface CalendarProps {
  recipes?: Array<{ id: string; title: string }>;
}

// Noms des types de repas en français
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Petit-déj',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
};

// Couleurs pour chaque type de repas
const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-orange-100 text-orange-800',
  lunch: 'bg-blue-100 text-blue-800',
  dinner: 'bg-purple-100 text-purple-800',
};

// Jours de la semaine en français
const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function Calendar({ recipes = [] }: CalendarProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(new Date());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<MealPlanFormState>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);

  // Récupérer les repas planifiés pour la semaine en cours (J à J+6)
  const fetchMealPlans = async () => {
    setLoading(true);
    try {
      // Calculer la date de fin (6 jours après la date de début)
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const result = await getMealPlans(startStr, endStr);
      setMealPlans(result.mealPlans);
    } catch (error) {
      console.error('Erreur lors du chargement des repas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealPlans();
  }, [startDate]);

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

  // Formatage des dates
  const formatShortDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatFullDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Gérer le clic sur un jour
  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedMealType(null);
  };

  // Gérer le clic sur un type de repas spécifique
  const handleMealTypeClick = (dateStr: string, mealType: MealType) => {
    // Vérifier s'il y a déjà un repas ce jour-là pour ce type
    const existing = mealPlans.find(
      mp => mp.date === dateStr && mp.mealType === mealType
    );

    if (existing) {
      // Demander confirmation de suppression
      const mealName = recipes.find(r => r.id === existing.recipeId)?.title || 
                       existing.customNote || 
                       MEAL_TYPE_LABELS[mealType];
      if (window.confirm(`Supprimer le repas "${mealName}" du ${new Date(dateStr).toLocaleDateString('fr-FR')} (${MEAL_TYPE_LABELS[mealType]}) ?`)) {
        deleteMealPlanAction(existing.id);
      }
    } else {
      // Ouvrir le sélecteur pour ajouter un repas
      setSelectedDate(dateStr);
      setSelectedMealType(mealType);
    }
  };

  const deleteMealPlanAction = async (id: string) => {
    const formData = new FormData();
    formData.append('id', id);
    
    const result = await deleteMealPlan(null, formData);
    if (result?.success) {
      setFormState({ success: true, message: result.message });
      fetchMealPlans();
      setTimeout(() => setFormState(null), 3000);
    } else {
      setFormState(result);
    }
  };

  const addMealPlanAction = async (recipeId: string | null, customNote?: string) => {
    if (!selectedDate || !selectedMealType) return;

    const formData = new FormData();
    formData.append('date', selectedDate);
    formData.append('mealType', selectedMealType);
    if (recipeId) formData.append('recipeId', recipeId);
    if (customNote) formData.append('customNote', customNote);
    
    const result = await addMealPlan(null, formData);
    if (result?.success) {
      setFormState({ success: true, message: result.message });
      fetchMealPlans();
      setSelectedDate(null);
      setSelectedMealType(null);
      setTimeout(() => setFormState(null), 3000);
    } else {
      setFormState(result);
    }
  };

  const cancelSelection = () => {
    setSelectedDate(null);
    setSelectedMealType(null);
  };

  // Récupérer les repas pour une date
  const getPlansForDate = (dateStr: string): MealPlan[] => {
    return mealPlans.filter(mp => mp.date === dateStr);
  };

  // Compter le nombre de repas pour une date
  const getMealCountForDate = (dateStr: string): number => {
    return getPlansForDate(dateStr).length;
  };

  // Récupérer la liste des types de repas pour une date
  const getMealTypesForDate = (dateStr: string): string[] => {
    return getPlansForDate(dateStr).map(mp => mp.mealType);
  };

  // Générer les jours à afficher (7 jours)
  const renderDays = () => {
    const days: JSX.Element[] = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      const dateStr = getDateString(date);
      const isToday = dateStr === getDateString(new Date());
      const plansCount = getMealCountForDate(dateStr);
      const mealTypes = getMealTypesForDate(dateStr);

      // Vérifier si la date est dans le passé (optionnel : désactiver)
      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

      days.push(
        <div key={dateStr} className="relative">
          {/* Jour de la semaine */}
          <div className="text-xs font-medium text-gray-500 text-center mb-1">
            {DAYS_OF_WEEK[date.getDay()]}
          </div>
          
          {/* Date */}
          <div className={`text-center font-bold mb-2 ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
            {date.getDate()}
          </div>
          
          {/* Indicateur de nombre de repas */}
          {plansCount > 0 ? (
            <div className="flex flex-wrap gap-1 justify-center mb-2">
              {mealPlans
                .filter(mp => mp.date === dateStr)
                .map(plan => (
                  <span
                    key={`${plan.date}-${plan.mealType}`}
                    className={`text-xs px-2 py-0.5 rounded-full ${MEAL_TYPE_COLORS[plan.mealType]}`}
                    title={plan.customNote || recipes.find(r => r.id === plan.recipeId)?.title || MEAL_TYPE_LABELS[plan.mealType]}
                  >
                    {plan.customNote || recipes.find(r => r.id === plan.recipeId)?.title || MEAL_TYPE_LABELS[plan.mealType]}
                  </span>
                ))}
            </div>
          ) : (
            <div className="min-h-[24px] flex items-center justify-center mb-2">
              <span className="text-xs text-gray-400">Aucun repas</span>
            </div>
          )}
          
          {/* Bouton de planification */}
          <button
            onClick={() => handleDateClick(dateStr)}
            className={`w-full text-xs py-1.5 rounded border transition-colors ${
              isPast 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
            }`}
            disabled={isPast}
            title={isPast ? 'Date dans le passé' : 'Ajouter un repas'}
          >
            + Planifier
          </button>
        </div>
      );
    }

    return days;
  };

  // Modal pour sélectionner une recette
  const RecipeSelectorModal = () => {
    if (!selectedDate) return null;

    const dateObj = new Date(selectedDate);
    const isPastDate = dateObj < new Date(new Date().setHours(0, 0, 0, 0));

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-bold text-lg">
              Planifier un repas
            </h3>
            <p className="text-sm text-gray-600">
              {formatFullDate(new Date(selectedDate))}
            </p>
          </div>

          <div className="p-4">
            {isPastDate ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Impossible de planifier un repas dans le passé.</p>
              </div>
            ) : (
              <>
                {/* Sélection du type de repas */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Type de repas :</h4>
                  <div className="flex gap-2">
                    {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(mealType => (
                      <button
                        key={mealType}
                        onClick={() => setSelectedMealType(mealType as MealType)}
                        className={`px-3 py-1 rounded border text-sm transition-colors ${
                          selectedMealType === mealType
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {MEAL_TYPE_LABELS[mealType]}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedMealType && (
                  <>
                    {/* Option : Choisir une recette existante */}
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Recettes disponibles :</h4>
                      {recipes.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          Aucune recette disponible. <Link href="/recipes/new" className="text-blue-600 hover:underline">Créer une recette</Link>
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                          {recipes.map(recipe => (
                            <button
                              key={recipe.id}
                              onClick={() => addMealPlanAction(recipe.id, undefined)}
                              className="w-full text-left p-2 border rounded hover:bg-gray-50 transition-colors"
                            >
                              {recipe.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Option : Ajouter un repas personnalisé */}
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Ou créer un repas personnalisé :</h4>
                      <input
                        type="text"
                        id="customNote"
                        placeholder="Ex: Soirée Pizza, Barbecue..."
                        className="w-full p-2 border rounded"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addMealPlanAction(null, e.currentTarget.value);
                          }
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={cancelSelection}
                    className="px-4 py-2 border rounded hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  {selectedMealType && !isPastDate && (
                    <button
                      onClick={() => {
                        const customNoteInput = document.getElementById('customNote') as HTMLInputElement;
                        addMealPlanAction(null, customNoteInput?.value);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Ajouter
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Message de feedback
  const FeedbackMessage = () => {
    if (!formState) return null;
    
    return (
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg ${
        formState.success ? 'bg-green-100 border border-green-300 text-green-800' : 'bg-red-100 border border-red-300 text-red-800'
      }`}>
        {formState.message || formState.errors?.form?.[0] || 'Action effectuée'}
      </div>
    );
  };

  return (
    <section className="w-full max-w-4xl mx-auto mb-8">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Semaine en cours</h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousDay}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
              disabled={loading}
              title="Semaine précédente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextDay}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
              disabled={loading}
              title="Semaine suivante"
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
          <div className="grid grid-cols-7 gap-2">
            {renderDays()}
          </div>
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

      {/* Modal de sélection */}
      <RecipeSelectorModal />

      {/* Feedback */}
      <FeedbackMessage />
    </section>
  );
}
