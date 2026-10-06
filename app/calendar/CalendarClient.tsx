'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getMealPlans,
  addMealPlan,
  deleteMealPlanFromForm,
  replanMealPlan,
  getAllMealPlans,
  MealPlan
} from '@/app/actions/meal-plan';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

interface Recipe {
  id: string;
  title: string;
  mealCourse?: string | null;
}

interface CalendarClientProps {
  recipes: Recipe[];
}

// Types de repas avec couleurs
const MEAL_TYPES: { id: MealType; label: string; color: string; shortLabel: string }[] = [
  { id: 'breakfast', label: 'Petit-déjeuner', color: 'bg-orange-100 text-orange-800 border-orange-200', shortLabel: 'Petit-déj' },
  { id: 'lunch', label: 'Déjeuner', color: 'bg-blue-100 text-blue-800 border-blue-200', shortLabel: 'Déjeuner' },
  { id: 'snack', label: 'Goûter', color: 'bg-green-100 text-green-800 border-green-200', shortLabel: 'Goûter' },
  { id: 'dinner', label: 'Dîner', color: 'bg-purple-100 text-purple-800 border-purple-200', shortLabel: 'Dîner' },
] as const;

// Jours de la semaine
const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAYS_OF_WEEK_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// Type pour un créneau de calendrier (utilisé pour dnd-kit)
interface CalendarSlot {
  id: string;
  date: string;
  mealType: MealType;
  mealPlanId: string | null;
  hasMealPlan: boolean;
}

export default function CalendarClient({ recipes = [] }: CalendarClientProps) {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<string>('');
  const [modalMealType, setModalMealType] = useState<MealType | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState<string>('');
  const [servings, setServings] = useState<number>(4);

  // Charger les repas planifiés
  const fetchMealPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allPlans = await getAllMealPlans();
      setMealPlans(allPlans);
    } catch (err) {
      console.error('Erreur lors du chargement des repas:', err);
      setError('Impossible de charger les repas planifiés');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMealPlans();
  }, [fetchMealPlans]);

  // Formater une date en YYYY-MM-DD
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  // Formater une date pour affichage
  const formatDisplayDate = (date: Date): string => 
    `${DAYS_OF_WEEK[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;

  // Naviguer vers la semaine suivante/précédente
  const goToNextWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 7);
    setStartDate(newDate);
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 7);
    setStartDate(newDate);
  };

  const goToToday = () => {
    setStartDate(new Date());
  };

  // Ouvrir le modal pour ajouter un repas
  const openAddMealModal = (date: string, mealType: MealType) => {
    const dateObj = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateObj < today) {
      setError('Impossible d\'ajouter un repas dans le passé');
      return;
    }

    setModalDate(date);
    setModalMealType(mealType);
    setSelectedRecipeId(null);
    setCustomNote('');
    setServings(4);
    setShowModal(true);
  };

  // Ajouter un repas planifié
  const handleAddMealPlan = async () => {
    if (!modalDate || !modalMealType) return;

    const formData = new FormData();
    formData.append('date', modalDate);
    formData.append('mealType', modalMealType);
    
    if (selectedRecipeId) formData.append('recipeId', selectedRecipeId);
    if (customNote) formData.append('customNote', customNote);
    formData.append('servings', servings.toString());

    try {
      const result = await addMealPlan(null, formData);
      
      if (result.success) {
        setShowModal(false);
        await fetchMealPlans();
        setError(null);
      } else {
        setError(result.message || 'Erreur lors de l\'ajout');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de l\'ajout du repas');
    }
  };

  // Supprimer un repas planifié
  const handleDeleteMealPlan = async (id: string) => {
    try {
      const formData = new FormData();
      formData.append('id', id);
      
      const result = await deleteMealPlanFromForm(null, formData);
      
      if (result.success) {
        await fetchMealPlans();
        setError(null);
      } else {
        setError(result.message || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la suppression du repas');
    }
  };

  // Replanifier un repas via drag & drop
  const handleDrop = async (droppedSlot: CalendarSlot, draggedMealPlan: MealPlan) => {
    // Ne pas déplacer si on drop sur le même créneau
    if (droppedSlot.date === draggedMealPlan.date && droppedSlot.mealType === draggedMealPlan.mealType) {
      return;
    }

    // Vérifier que la nouvelle date n'est pas dans le passé
    const droppedDateObj = new Date(droppedSlot.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (droppedDateObj < today) {
      setError('Impossible de déplacer un repas dans le passé');
      return;
    }

    try {
      const result = await replanMealPlan(
        draggedMealPlan.id,
        droppedSlot.date,
        droppedSlot.mealType
      );
      
      if (!result.error) {
        await fetchMealPlans();
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la replanification');
    }
  };

  // Générer les créneaux du calendrier pour la semaine
  const generateCalendarSlots = (): CalendarSlot[] => {
    const slots: CalendarSlot[] = [];
    const currentDate = new Date(startDate);
    
    for (let day = 0; day < 7; day++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + day);
      const dateStr = formatDate(date);
      
      for (const mealType of MEAL_TYPES) {
        const existingMealPlan = mealPlans.find(
          mp => mp.date === dateStr && mp.mealType === mealType.id
        );
        
        slots.push({
          id: `${dateStr}-${mealType.id}`,
          date: dateStr,
          mealType: mealType.id,
          mealPlanId: existingMealPlan?.id || null,
          hasMealPlan: !!existingMealPlan
        });
      }
    }
    
    return slots;
  };

  // Trouver un créneau par ID
  const findSlotById = (id: string): CalendarSlot | null => {
    const slots = generateCalendarSlots();
    return slots.find(slot => slot.id === id) || null;
  };

  // Récupérer un repas planifié par ID
  const getMealPlanById = (id: string | null): MealPlan | null => {
    if (!id) return null;
    return mealPlans.find(mp => mp.id === id) || null;
  };

  // Récupérer le nom de la recette
  const getRecipeTitle = (recipeId: string | null): string => {
    if (!recipeId) return '';
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe ? recipe.title : 'Recette inconnue';
  };

  // Rendu d'un créneau draggable
  const MealSlot = ({ slot, mealPlan, recipes }: { slot: CalendarSlot; mealPlan: MealPlan | null; recipes: Recipe[] }) => {
    const mealType = MEAL_TYPES.find(mt => mt.id === slot.mealType)!;
    
    if (!mealPlan) {
      // Créneau vide - zone de drop
      const { setNodeRef } = useDroppable({
        id: slot.id,
        data: slot
      });

      const isPast = new Date(slot.date + 'T00:00:00') < new Date(new Date().setHours(0, 0, 0, 0));
      
      return (
        <div
          ref={setNodeRef}
          className={`p-2 rounded border-2 border-dashed border-gray-300 min-h-[60px] flex items-center justify-center text-xs transition-colors ${
            isPast ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-blue-50'
          }`}
        >
          + {mealType.shortLabel}
        </div>
      );
    } else {
      // Créneau avec un repas - élément draggable
      const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: mealPlan.id,
        data: { mealPlan, fromSlot: slot }
      });

      const displayText = mealPlan.customNote || getRecipeTitle(mealPlan.recipeId) || mealType.label;
      const style = {
        transform: CSS.Transform.toString(transform),
        transition: 'transform 250ms ease',
        cursor: 'grab',
        zIndex: 1000,
      };

      return (
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={`p-2 rounded ${mealType.color} border-2 border-transparent hover:border-gray-400 min-h-[60px] flex items-center justify-center text-center text-xs`}
          onClick={(e) => {
            e.stopPropagation();
            const confirmDelete = window.confirm(
              `Supprimer "${displayText}" du ${new Date(mealPlan.date).toLocaleDateString('fr-FR')} (${mealType.label}) ?`
            );
            if (confirmDelete) {
              handleDeleteMealPlan(mealPlan.id);
            }
          }}
          title={`Cliquez pour supprimer: ${displayText}`}
        >
          <span className="truncate block">{displayText}</span>
        </div>
      );
    }
  };

  // Rendu de la grille du calendrier
  const renderCalendarGrid = () => {
    const calendarSlots = generateCalendarSlots();
    
    // Grouper les créneaux par jour
    const slotsByDay: Record<string, CalendarSlot[]> = {};
    calendarSlots.forEach(slot => {
      if (!slotsByDay[slot.date]) {
        slotsByDay[slot.date] = [];
      }
      slotsByDay[slot.date].push(slot);
    });

    // Obtenir la liste des jours
    const days = Object.keys(slotsByDay).sort();
    
    return (
      <div className="overflow-x-auto">
        {/* En-têtes des jours */}
        <div className="flex mb-2">
          {days.map(date => (
            <div 
              key={date}
              className="flex-shrink-0 w-[140px] text-center text-sm font-medium py-1"
            >
              {new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
            </div>
          ))}
        </div>

        {/* Lignes par type de repas */}
        {MEAL_TYPES.map(mealType => (
          <div key={mealType.id} className="flex mb-1">
            {/* Libellé du type de repas */}
            <div className="w-[100px] flex-shrink-0 flex items-center justify-end pr-2 font-medium text-sm">
              {mealType.label}:
            </div>
            
            {/* Créneaux pour chaque jour */}
            {days.map(date => {
              const daySlots = slotsByDay[date] || [];
              const slot = daySlots.find(s => s.mealType === mealType.id);
              const mealPlan = slot ? getMealPlanById(slot.mealPlanId) : null;
              
              if (!slot) return null;
              
              return (
                <div 
                  key={`${date}-${mealType.id}`}
                  className="flex-shrink-0 w-[140px] px-1"
                >
                  <MealSlot slot={slot} mealPlan={mealPlan} recipes={recipes} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Gestion du drop (sera utilisé par le conteneur parent DndContext)
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    
    // Si on a relâché sur un créneau
    if (over && active.id !== over.id) {
      const draggedMealPlan = active.data.current?.mealPlan;
      const droppedSlot = over.data.current?.slot;
      
      if (draggedMealPlan && droppedSlot) {
        handleDrop(droppedSlot, draggedMealPlan);
      }
    }
  }, [handleDrop]);

  // Vue semaine (par défaut)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  return (
    <div className="space-y-4">
      {/* Controles de navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousWeek}
            className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-50"
            disabled={loading}
            title="Semaine précédente"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={goToToday}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
          >
            Aujourd'hui
          </button>
          
          <button
            onClick={goToNextWeek}
            className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-50"
            disabled={loading}
            title="Semaine suivante"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Sélecteur de vue */}
          <div className="flex gap-1 ml-4">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs rounded ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Semaine
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs rounded ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Mois
            </button>
          </div>
        </div>
        
        {/* Affichage de la période */}
        <div className="text-sm text-gray-600 text-center">
          Semaine du {formatDisplayDate(startDate)}
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-800 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Affichage du calendrier */}
      <div className="bg-white rounded-lg shadow-sm p-4 min-h-[400px]">
        {loading ? (
          <div className="text-center py-8">Chargement des repas...</div>
        ) : (
          <div className="space-y-2">
            {/* En-têtes */}
            <div className="flex">
              <div className="w-[100px] flex-shrink-0"></div>
              {[...Array(7)].map((_, i) => {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                const dateStr = formatDate(date);
                return (
                  <div key={dateStr} className="flex-shrink-0 w-[140px] text-center text-sm font-medium py-1">
                    {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                  </div>
                );
              })}
            </div>

            {renderCalendarGrid()}
          </div>
        )}
      </div>

      {/* Bouton pour ajouter un repas */}
      <div className="text-center">
        <button
          onClick={() => openAddMealModal(formatDate(startDate), 'dinner')}
          className="text-sm text-blue-600 hover:underline"
        >
          + Ajouter un repas
        </button>
      </div>

      {/* Modal d'ajout de repas */}
      {showModal && modalMealType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg">
                Planifier un repas
              </h3>
              <p className="text-sm text-gray-600">
                {new Date(modalDate).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-500">
                {MEAL_TYPES.find(mt => mt.id === modalMealType)?.label}
              </p>
            </div>

            <div className="p-4">
              {/* Sélection de recette */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Choisir une recette (optionnel) :
                </label>
                {recipes.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    Aucune recette disponible. <Link href="/recipes/new" className="text-blue-600 hover:underline">Créer une recette</Link>
                  </p>
                ) : (
                  <select
                    value={selectedRecipeId || ''}
                    onChange={(e) => setSelectedRecipeId(e.target.value || null)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">-- Sélectionner une recette --</option>
                    {recipes.map(recipe => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Ou note personnalisée */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Ou saisir un repas personnalisé :
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Ex: Soirée Pizza, Barbecue, Repas chez belle-maman..."
                  className="w-full p-2 border rounded"
                  disabled={!!selectedRecipeId}
                />
              </div>

              {/* Nombre de couverts */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Nombre de couverts :
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value) || 4)}
                  min="1"
                  max="20"
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddMealPlan}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Planifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
