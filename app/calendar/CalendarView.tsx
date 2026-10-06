'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { MealSlot } from './MealSlot';
import type { MealPlan, MealType, Recipe } from '@/app/types/meal-plan';
import { replanMealPlan, deleteMealPlan, addMealPlan } from '@/app/actions/meal-plan';

interface CalendarViewProps {
  initialRecipes: Recipe[];
  initialMealPlans: MealPlan[];
}

// Types de repas avec couleurs et labels
const MEAL_TYPES: { id: MealType; label: string; color: string; shortLabel: string }[] = [
  { id: 'breakfast', label: 'Petit-déjeuner', color: 'bg-orange-100 text-orange-800 border-orange-200', shortLabel: 'Petit-déj' },
  { id: 'lunch', label: 'Déjeuner', color: 'bg-blue-100 text-blue-800 border-blue-200', shortLabel: 'Déjeuner' },
  { id: 'snack', label: 'Goûter', color: 'bg-green-100 text-green-800 border-green-200', shortLabel: 'Goûter' },
  { id: 'dinner', label: 'Dîner', color: 'bg-purple-100 text-purple-800 border-purple-200', shortLabel: 'Dîner' },
] as const;

// Jours de la semaine
const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Type pour un créneau de calendrier
interface CalendarSlot {
  id: string;
  date: string;
  mealType: MealType;
  mealPlanId: string | null;
  hasMealPlan: boolean;
}

// Composant Overlay pour le drag
function DragOverlayComponent({ item }: { item: { mealPlan: MealPlan; fromSlot: CalendarSlot } | null }) {
  if (!item?.mealPlan) return null;

  const mealType = MEAL_TYPES.find(mt => mt.id === item.mealPlan.mealType) || MEAL_TYPES[0];
  const displayText = item.mealPlan.customNote || 
    (item.fromSlot ? `Repas du ${new Date(item.fromSlot.date).toLocaleDateString('fr-FR')}` : 'Repas');

  return (
    <div 
      className={`p-2 rounded ${mealType.color} shadow-lg border-2 border-gray-400 cursor-grabbing`}
      style={{
        transform: 'scale(1.05)',
        zIndex: 9999,
        minWidth: '120px',
      }}
    >
      <span className="text-xs truncate block max-w-[200px]">{displayText}</span>
    </div>
  );
}

// Modal pour ajouter/modifier un repas
function MealPlanModal({
  isOpen,
  onClose,
  onSubmit,
  date,
  mealType,
  recipes,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (recipeId: string | null, customNote: string, servings: number) => void;
  date: string;
  mealType: MealType | null;
  recipes: Recipe[];
}) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState<string>('');
  const [servings, setServings] = useState<number>(4);

  if (!isOpen || !mealType) return null;

  const handleSubmit = () => {
    onSubmit(selectedRecipeId, customNote, servings);
  };

  const dateObj = new Date(date);
  const isPastDate = dateObj < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg">Planifier un repas</h3>
          <p className="text-sm text-gray-600">
            {dateObj.toLocaleDateString('fr-FR', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
            })}
          </p>
          <p className="text-sm text-gray-500">
            {MEAL_TYPES.find(mt => mt.id === mealType)?.label}
          </p>
        </div>

        <div className="p-4">
          {isPastDate ? (
            <div className="text-center py-4">
              <p className="text-red-500">Impossible de planifier un repas dans le passé.</p>
            </div>
          ) : (
            <>
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
                  onClick={onClose}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Planifier
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant principal du calendrier
function CalendarGrid({
  startDate,
  mealPlans,
  recipes,
  onAddMeal,
  onDeleteMeal,
  onDrop,
}: {
  startDate: Date;
  mealPlans: MealPlan[];
  recipes: Recipe[];
  onAddMeal: (date: string, mealType: MealType) => void;
  onDeleteMeal: (mealPlanId: string) => void;
  onDrop: (slot: CalendarSlot, mealPlan: MealPlan) => void;
}) {
  // Formater une date en YYYY-MM-DD
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

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

  // Rendu de la grille du calendrier
  const calendarSlots = generateCalendarSlots();
  const days = [...new Set(calendarSlots.map(slot => slot.date))].sort();

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
      {/* En-têtes des jours */}
      <div className="flex min-w-max">
        <div className="w-[120px] flex-shrink-0"></div>
        {days.map(date => (
          <div 
            key={date}
            className="flex-shrink-0 w-[160px] text-center text-sm font-medium py-2"
          >
            {new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
          </div>
        ))}
      </div>

      {/* Lignes par type de repas */}
      {MEAL_TYPES.map(mealType => (
        <div key={mealType.id} className="flex min-w-max">
          {/* Libellé du type de repas */}
          <div className="w-[120px] flex-shrink-0 flex items-center justify-end pr-2 font-medium text-sm">
            {mealType.label}:
          </div>
          
          {/* Créneaux pour chaque jour */}
          {days.map(date => {
            const daySlots = calendarSlots.filter(s => s.date === date && s.mealType === mealType.id);
            const slot = daySlots[0];
            const mealPlan = slot ? mealPlans.find(mp => mp.id === slot.mealPlanId) || null : null;
            const isPast = new Date(date + 'T00:00:00') < new Date(new Date().setHours(0, 0, 0, 0));
            
            if (!slot) return null;
            
            return (
              <div 
                key={`${date}-${mealType.id}`}
                className="flex-shrink-0 w-[160px] px-2 py-1"
              >
                <MealSlot
                  slot={slot}
                  mealPlan={mealPlan}
                  recipes={recipes}
                  isPast={isPast}
                  onDrop={onDrop}
                  onAddMeal={() => onAddMeal(slot.date, slot.mealType)}
                  onDeleteMeal={onDeleteMeal}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function CalendarView({ initialRecipes, initialMealPlans }: CalendarViewProps) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>(initialMealPlans);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [activeItem, setActiveItem] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<string>('');
  const [modalMealType, setModalMealType] = useState<MealType | null>(null);

  // Sensors pour dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Charger les repas planifiés
  const fetchMealPlans = useCallback(async () => {
    // Recharger depuis les props ou via Server Action
    // Pour l'instant, on garde les données initiales
    setMealPlans(initialMealPlans);
  }, [initialMealPlans]);

  // Formater une date pour affichage
  const formatDisplayDate = (date: Date): string => 
    `${DAYS_OF_WEEK[date.getDay()]} ${date.getDate()} ${date.toLocaleDateString('fr-FR', { month: 'long' })}`;

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
    setShowModal(true);
  };

  // Ajouter un repas planifié
  const handleAddMealPlan = async (recipeId: string | null, customNote: string, servings: number) => {
    if (!modalDate || !modalMealType) return;

    const formData = new FormData();
    formData.append('date', modalDate);
    formData.append('mealType', modalMealType);
    
    if (recipeId) formData.append('recipeId', recipeId);
    if (customNote) formData.append('customNote', customNote);
    formData.append('servings', servings.toString());

    try {
      const result = await addMealPlan(null, formData);
      
      if (result.success) {
        setShowModal(false);
        setError(null);
        // Recharger les repas planifiés
        fetchMealPlans();
      } else {
        setError(result.message || 'Erreur lors de l\'ajout');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de l\'ajout du repas');
    }
  };

  // Supprimer un repas planifié
  const handleDeleteMealPlan = async (mealPlanId: string) => {
    try {
      await deleteMealPlan(mealPlanId);
      setError(null);
      // Recharger les repas planifiés
      fetchMealPlans();
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
        setError(null);
        // Recharger les repas planifiés
        fetchMealPlans();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la replanification');
    }
  };

  // Gestion du drag
  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Si on a relâché sur un créneau
    if (over && active.id !== over.id) {
      const draggedMealPlan = active.data.current?.mealPlan;
      const droppedSlot = over.data.current?.slot;
      
      if (draggedMealPlan && droppedSlot) {
        handleDrop(droppedSlot, draggedMealPlan);
      }
    }
    
    setActiveItem(null);
  };

  const handleDragCancel = () => {
    setActiveItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Contrôles de navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
            disabled={false}
            title="Semaine précédente"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Aujourd'hui
          </button>
          
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
            disabled={false}
            title="Semaine suivante"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
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

      {/* DndContext - doit envelopper tout le contenu DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Affichage du calendrier */}
        <div className="min-h-[400px]">
          <CalendarGrid
            startDate={startDate}
            mealPlans={mealPlans}
            recipes={initialRecipes}
            onAddMeal={openAddMealModal}
            onDeleteMeal={handleDeleteMealPlan}
            onDrop={handleDrop}
          />
        </div>

        {/* Overlay pendant le drag */}
        <DragOverlay dropAnimation={null}>
          {activeItem && <DragOverlayComponent item={activeItem} />}
        </DragOverlay>
      </DndContext>

      {/* Modal d'ajout de repas */}
      <MealPlanModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleAddMealPlan}
        date={modalDate}
        mealType={modalMealType}
        recipes={initialRecipes}
      />
    </div>
  );
}
