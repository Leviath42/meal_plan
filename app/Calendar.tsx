'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMealPlans, addMealPlan, deleteMealPlan, MealPlanFormState, MealType } from './actions/meal-plan';
import { useRouter } from 'next/navigation';
import type { JSX } from 'react';


interface MealPlan {
  id: string;
  date: string;
  mealType: string; // Peut être 'breakfast' | 'lunch' | 'dinner' mais vient de la DB comme string
  recipeId: string | null;
  customNote: string | null;
  servings: number | null;
}

interface CalendarProps {
  recipes?: Array<{ id: string; title: string }>;
}

// Noms des types de repas en français
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
};

// Couleurs pour chaque type de repas
const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: 'bg-orange-100 text-orange-800 border-orange-300',
  lunch: 'bg-blue-100 text-blue-800 border-blue-300',
  dinner: 'bg-purple-100 text-purple-800 border-purple-300',
};

export default function Calendar({ recipes = [] }: CalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<MealPlanFormState>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);

  // Récupérer les repas planifiés pour le mois en cours
  const fetchMealPlans = async () => {
    setLoading(true);
    try {
      const startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      ).toISOString().split('T')[0];
      
      const endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).toISOString().split('T')[0];

      const result = await getMealPlans(startDate, endDate);
      setMealPlans(result.mealPlans);
    } catch (error) {
      console.error('Erreur lors du chargement des repas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealPlans();
  }, [currentDate]);

  // Gestion des mois
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Formatage des dates
  const formatMonthYear = (date: Date): string => {
    return date.toLocaleString('fr-FR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  // Gérer le clic sur un jour
  const handleDateClick = (date: string, mealType: MealType) => {
    // Vérifier s'il y a déjà un repas ce jour-là pour ce type
    const existing = mealPlans.find(
      mp => mp.date === date && mp.mealType === mealType
    );

    if (existing) {
      // Demander confirmation de suppression
      if (window.confirm(`Supprimer le repas "${existing.customNote || recipes.find(r => r.id === existing.recipeId)?.title || 'non nommé'}" du ${formatDate(date)} (${MEAL_TYPE_LABELS[mealType]}) ?`)) {
        deleteMealPlanAction(existing.id);
      }
    } else {
      // Ouvrir le sélecteur de recette
      setSelectedDate(date);
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

  // Formatage de date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  // Récupérer les repas pour une date
  const getPlansForDate = (date: string): MealPlan[] => {
    return mealPlans.filter(mp => mp.date === date);
  };

  // Récupérer le repas pour un type spécifique
  const getPlanForMealType = (date: string, mealType: MealType): MealPlan | undefined => {
    return mealPlans.find(mp => mp.date === date && mp.mealType === mealType);
  };

  // Générer le calendrier
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = getFirstDayOfWeek(year, month);

    const days: JSX.Element[] = [];

    // Jours vides pour le début de la semaine
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2"></div>
      );
    }

    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(year, month, day).toISOString().split('T')[0];
      const plansForDay = getPlansForDate(dateStr);

      days.push(
        <div key={dateStr} className="p-1 min-h-[100px]">
          <div className="font-medium text-gray-800 mb-1">{day}</div>
          
          {/* Slots pour chaque type de repas */}
          {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((mealType) => {
            const plan = getPlanForMealType(dateStr, mealType);
            const label = MEAL_TYPE_LABELS[mealType];
            const colorClass = MEAL_TYPE_COLORS[mealType];

            return (
              <button
                key={`${dateStr}-${mealType}`}
                onClick={() => handleDateClick(dateStr, mealType)}
                className={`w-full text-xs truncate text-left px-1.5 py-1 mb-0.5 rounded ${colorClass} ${plan ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
                title={plan ? `${label}: ${recipes.find(r => r.id === plan.recipeId)?.title || plan.customNote || 'Repas'}` : `Ajouter un ${label.toLowerCase()}`}
              >
                {plan ? (
                  <>
                    <span className="font-semibold">{label.split('')[0]}:</span> {recipes.find(r => r.id === plan.recipeId)?.title || plan.customNote || 'Repas'}
                  </>
                ) : (
                  <span className="italic">+ {label}</span>
                )}
              </button>
            );
          })}
        </div>
      );
    }

    return days;
  };

  // Modal pour sélectionner une recette
  const RecipeSelectorModal = () => {
    if (!selectedDate || !selectedMealType) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-bold text-lg">
              Ajouter un repas pour le {formatDate(selectedDate)}
            </h3>
            <p className="text-sm text-gray-600">
              {MEAL_TYPE_LABELS[selectedMealType]}
            </p>
          </div>

          <div className="p-4">
            {/* Option : Choisir une recette existante */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Recettes disponibles :</h4>
              {recipes.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucune recette disponible. <Link href="/recipes/new" className="text-blue-600 hover:underline">Créer une recette</Link></p>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {recipes.map(recipe => (
                    <button
                      key={recipe.id}
                      onClick={() => addMealPlanAction(recipe.id)}
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

            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelSelection}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
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
          <h2 className="text-lg font-bold text-gray-800">Calendrier des Repas</h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-1 rounded hover:bg-gray-100"
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-medium">{formatMonthYear(currentDate)}</span>
            <button
              onClick={goToNextMonth}
              className="p-1 rounded hover:bg-gray-100"
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Chargement du calendrier...</div>
        ) : (
          <>
            {/* En-têtes des jours de la semaine */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center font-medium text-xs text-gray-600 p-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Jours du calendrier */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </>
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
