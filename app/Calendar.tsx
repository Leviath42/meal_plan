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
  mealCourse?: string | null;
}

interface CalendarProps {
  recipes?: Array<{ id: string; title: string }>;
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
  lunch: 'bg-blue-100 text-blue-800',
  snack: 'bg-green-100 text-green-800',
  dinner: 'bg-purple-100 text-purple-800',
};

// Ordre chronologique des types de repas
const MEAL_TYPE_ORDER: string[] = ['breakfast', 'lunch', 'snack', 'dinner'];

// Types de plats pour l'ordre chronologique dans un repas
const MEAL_COURSE_ORDER: string[] = ['apéritif', 'entrée', 'plat', 'accompagnement', 'dessert', 'boisson'];

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

  const addMealPlanAction = async (recipeId: string | null, customNote?: string, servings: number = 4) => {
    if (!selectedDate || !selectedMealType) return;

    const formData = new FormData();
    formData.append('date', selectedDate);
    formData.append('mealType', selectedMealType);
    if (recipeId) formData.append('recipeId', recipeId);
    if (customNote) formData.append('customNote', customNote);
    formData.append('servings', servings.toString());
    
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

  // Composant DayCard pour le layout vertical
  const DayCard = ({ 
    day, 
    dateStr, 
    isToday, 
    isPast, 
    plans, 
    recipes, 
    onDateClick,
    size = 'medium',
    isMainDay = false
  }: {
    day: Date;
    dateStr: string;
    isToday: boolean;
    isPast: boolean;
    plans: MealPlan[];
    recipes: Array<{ id: string; title: string }>;
    onDateClick: (dateStr: string) => void;
    size: 'large' | 'medium' | 'small';
    isMainDay: boolean;
  }) => {
    const sizeClasses = {
      large: 'w-full max-w-xs',
      medium: 'w-[92px] min-w-[92px]',
      small: 'w-[79px] min-w-[79px]'
    };
    
    const textSizeClasses = {
      large: {
        dayName: 'text-sm',
        date: 'text-xl font-bold',
        mealBadge: 'text-sm',
        noMeal: 'text-sm'
      },
      medium: {
        dayName: 'text-xs',
        date: 'text-sm font-bold',
        mealBadge: 'text-xs',
        noMeal: 'text-xs'
      },
      small: {
        dayName: 'text-xs',
        date: 'text-sm font-bold',
        mealBadge: 'text-xs',
        noMeal: 'text-xs'
      }
    };

    const classes = textSizeClasses[size];

    // Trier les repas par ordre chronologique : d'abord par type de repas, puis par type de plat
    const sortedPlans = [...plans].sort((a, b) => {
      // D'abord trier par type de repas (breakfast, lunch, snack, dinner)
      const mealTypeOrderA = MEAL_TYPE_ORDER.indexOf(a.mealType);
      const mealTypeOrderB = MEAL_TYPE_ORDER.indexOf(b.mealType);
      
      if (mealTypeOrderA !== mealTypeOrderB) {
        return mealTypeOrderA - mealTypeOrderB;
      }
      
      // Puis trier par type de plat (apéritif, entrée, plat, accompagnement, dessert, boisson)
      const courseA = a.mealCourse || '';
      const courseB = b.mealCourse || '';
      const courseOrderA = MEAL_COURSE_ORDER.indexOf(courseA);
      const courseOrderB = MEAL_COURSE_ORDER.indexOf(courseB);
      
      if (courseOrderA !== courseOrderB) {
        return courseOrderA - courseOrderB;
      }
      
      // Enfin trier par ID pour avoir un ordre déterministe
      return a.id.localeCompare(b.id);
    });

    // Formater le jour + date
    const formatDayHeader = () => {
      if (isMainDay) {
        // Format "MARDI 6" avec majuscules
        const dayName = day.toLocaleDateString('fr-FR', { weekday: 'long' }).toUpperCase();
        return `${dayName} ${day.getDate()}`;
      } else {
        // Format "MER. 7" avec majuscules et un seul point
        const dayName = day.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase().replace('.', '');
        return `${dayName}. ${day.getDate()}`;
      }
    };

    // Afficher les repas groupés par type pour les jours non principaux
    const renderMeals = () => {
      if (sortedPlans.length === 0) {
        return (
          <div className="flex items-center justify-center h-4">
            <span className={`text-gray-400 ${classes.noMeal}`}>Aucun repas</span>
          </div>
        );
      }
      
      if (isMainDay) {
        // Pour le jour principal, affichage classique avec retour à la ligne
        return (
          <div className="flex flex-col gap-1 w-full">
            {sortedPlans.map(plan => {
              const displayText = plan.customNote || 
                recipes.find(r => r.id === plan.recipeId)?.title || 
                MEAL_TYPE_LABELS[plan.mealType];
              
              return (
                <span
                  key={plan.id}
                  className={`px-2 py-0.5 rounded-full ${MEAL_TYPE_COLORS[plan.mealType]} ${classes.mealBadge} truncate text-center w-full`}
                  title={displayText}
                >
                  {displayText}
                </span>
              );
            })}
          </div>
        );
      } else {
        // Pour J+1 à J+6, afficher uniquement les types de repas qui ont un repas planifié
        return (
          <div className="flex flex-col gap-0.5 w-full">
            {sortedPlans.map(plan => {
              const displayText = plan.customNote || 
                recipes.find(r => r.id === plan.recipeId)?.title || 
                MEAL_TYPE_LABELS[plan.mealType];
              
              return (
                <span
                  key={plan.id}
                  className={`px-2 py-0.5 rounded-full ${MEAL_TYPE_COLORS[plan.mealType]} ${classes.mealBadge} truncate text-center`}
                  title={displayText}
                >
                  {displayText}
                </span>
              );
            })}
          </div>
        );
      }
    };

    return (
      <div className={`flex flex-col items-center p-2 bg-gray-50 rounded-lg ${sizeClasses[size]}`}>
        {/* Jour de la semaine + date */}
        <div className={`font-medium text-center mb-1 ${isToday ? 'text-blue-600' : 'text-gray-800'} ${classes.date}`}>
          {formatDayHeader()}
        </div>
        
        {/* Repas planifiés */}
        <div className="w-full mb-1 min-h-[20px]">
          {renderMeals()}
        </div>
        
        {/* Bouton de planification */}
        <button
          onClick={() => onDateClick(dateStr)}
          className={`w-16 text-xs py-1.5 rounded border transition-colors ${
            isPast 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
              : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
          }`}
          disabled={isPast}
          title={isPast ? 'Date dans le passé' : 'Ajouter un repas'}
        >
          +
        </button>
      </div>
    );
  };

  // Générer les jours à afficher (7 jours) - Layout 1-3-3 avec alignement par type
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
      return plan.customNote || 
        recipes.find(r => r.id === plan.recipeId)?.title || 
        MEAL_TYPE_LABELS[plan.mealType];
    };

    // Composant pour une ligne de jours (J+1-J+3 ou J+4-J+6) avec alignement par type de repas
    const MealTypeRow = ({ 
      days, 
      mealType, 
      onDateClick 
    }: { 
      days: typeof daysData;
      mealType: string;
      onDateClick: (dateStr: string) => void;
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
              <div key={`${dayData.dateStr}-${mealType}`} className="w-[92px] flex justify-center">
                {displayText && (
                  <span
                    className={`px-2 py-0.5 rounded-full ${MEAL_TYPE_COLORS[mealType]} text-xs truncate text-center max-w-[88px]`}
                    title={displayText}
                  >
                    {displayText}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    // Composant pour les boutons + alignés
    const PlusButtonRow = ({ days, onDateClick }: { 
      days: typeof daysData;
      onDateClick: (dateStr: string) => void;
    }) => {
      return (
        <div className="flex gap-3 justify-center">
          {days.map(dayData => (
            <div key={`plus-${dayData.dateStr}`} className="w-[92px] flex justify-center">
              <button
                onClick={() => onDateClick(dayData.dateStr)}
                className={`w-16 text-xs py-1.5 rounded border transition-colors ${
                  dayData.isPast 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
                }`}
                disabled={dayData.isPast}
                title={dayData.isPast ? 'Date dans le passé' : 'Ajouter un repas'}
              >
                +
              </button>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="flex flex-col gap-3">
        {/* Ligne 1 : J (aujourd'hui ou date de départ) */}
        <div className="flex justify-center">
          <DayCard 
            day={daysData[0].date} 
            dateStr={daysData[0].dateStr} 
            isToday={daysData[0].isToday} 
            isPast={daysData[0].isPast} 
            plans={daysData[0].plans} 
            recipes={recipes} 
            onDateClick={handleDateClick}
            size="large"
            isMainDay={true}
          />
        </div>
        
        {/* Ligne 2 : J+1, J+2, J+3 */}
        <div className="flex flex-col gap-0.5">
          {/* En-têtes des jours */}
          <div className="flex gap-3 justify-center mb-1">
            {daysData.slice(1, 4).map(dayData => (
              <div key={`header-${dayData.dateStr}`} className="w-[92px] text-center text-sm">
                {formatShortDay(dayData.date)}. {dayData.date.getDate()}
              </div>
            ))}
          </div>
          
          {/* Lignes par type de repas (seulement ceux qui ont des repas) */}
          {MEAL_TYPE_ORDER.map(mealType => (
            <MealTypeRow 
              key={mealType} 
              days={daysData.slice(1, 4)} 
              mealType={mealType} 
              onDateClick={handleDateClick}
            />
          ))}
          
          {/* Boutons + */}
          <PlusButtonRow days={daysData.slice(1, 4)} onDateClick={handleDateClick} />
        </div>
        
        {/* Ligne 3 : J+4, J+5, J+6 */}
        <div className="flex flex-col gap-0.5">
          {/* En-têtes des jours */}
          <div className="flex gap-3 justify-center mb-1">
            {daysData.slice(4, 7).map(dayData => (
              <div key={`header-${dayData.dateStr}`} className="w-[92px] text-center text-sm">
                {formatShortDay(dayData.date)}. {dayData.date.getDate()}
              </div>
            ))}
          </div>
          
          {/* Lignes par type de repas (seulement ceux qui ont des repas) */}
          {MEAL_TYPE_ORDER.map(mealType => (
            <MealTypeRow 
              key={mealType} 
              days={daysData.slice(4, 7)} 
              mealType={mealType} 
              onDateClick={handleDateClick}
            />
          ))}
          
          {/* Boutons + */}
          <PlusButtonRow days={daysData.slice(4, 7)} onDateClick={handleDateClick} />
        </div>
      </div>
    );
  };

  // Modal pour sélectionner une recette
  const RecipeSelectorModal = () => {
    if (!selectedDate) return null;

    const dateObj = new Date(selectedDate);
    const isPastDate = dateObj < new Date(new Date().setHours(0, 0, 0, 0));

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[70vh] overflow-y-auto">
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
                        <div className="space-y-2 max-h-[25vh] overflow-y-auto">
                          {recipes.map(recipe => (
                            <button
                              key={recipe.id}
                              onClick={() => {
                                const servingsInput = document.getElementById('servingsInput') as HTMLInputElement;
                                const servings = servingsInput?.value ? parseInt(servingsInput.value) || 4 : 4;
                                addMealPlanAction(recipe.id, undefined, servings);
                              }}
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
                            const servingsInput = document.getElementById('servingsInput') as HTMLInputElement;
                            const servings = servingsInput?.value ? parseInt(servingsInput.value) || 4 : 4;
                            addMealPlanAction(null, e.currentTarget.value, servings);
                          }
                        }}
                      />
                      <div className="mt-2">
                        <label className="text-sm text-gray-700 mr-2">Couverts:</label>
                        <input
                          type="number"
                          id="servingsInput"
                          defaultValue="4"
                          min="1"
                          max="20"
                          className="w-16 p-1 border rounded text-sm"
                        />
                      </div>
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
                        const servingsInput = document.getElementById('servingsInput') as HTMLInputElement;
                        const servings = servingsInput?.value ? parseInt(servingsInput.value) || 4 : 4;
                        addMealPlanAction(null, customNoteInput?.value, servings);
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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-gray-800 capitalize">
            {startDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h2>
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

      {/* Modal de sélection */}
      <RecipeSelectorModal />

      {/* Feedback */}
      <FeedbackMessage />
    </section>
  );
}
