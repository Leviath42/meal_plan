'use client';

import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { MealPlan, MealType, Recipe } from '@/app/types/meal-plan';

interface CalendarSlot {
  id: string;
  date: string;
  mealType: MealType;
  mealPlanId: string | null;
  hasMealPlan: boolean;
}

// Couleurs par type de repas
const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-orange-100 text-orange-800 border-orange-200',
  lunch: 'bg-blue-100 text-blue-800 border-blue-200',
  snack: 'bg-green-100 text-green-800 border-green-200',
  dinner: 'bg-purple-100 text-purple-800 border-purple-200',
};

// Labels courts par type de repas
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Petit-déj',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner',
};

interface MealSlotProps {
  slot: CalendarSlot;
  mealPlan: MealPlan | null;
  recipes: Recipe[];
  isPast: boolean;
  onDrop: (slot: CalendarSlot, mealPlan: MealPlan) => void;
  onAddMeal: (slot: CalendarSlot) => void;
  onDeleteMeal: (mealPlanId: string) => void;
}

export function MealSlot({ 
  slot, 
  mealPlan, 
  recipes, 
  isPast,
  onDrop,
  onAddMeal,
  onDeleteMeal
}: MealSlotProps) {
  const mealType = slot.mealType;
  const colorClass = MEAL_TYPE_COLORS[mealType] || 'bg-gray-100 text-gray-700';
  const label = MEAL_TYPE_LABELS[mealType] || mealType;

  if (!mealPlan) {
    // Créneau vide - zone de drop
    const { setNodeRef } = useDroppable({
      id: slot.id,
      data: { slot },
      disabled: isPast,
    });

    return (
      <div
        ref={setNodeRef}
        className={`p-2 rounded border-2 border-dashed border-gray-300 min-h-[60px] flex items-center justify-center text-xs transition-colors ${
          isPast ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
        }`}
        onClick={() => !isPast && onAddMeal(slot)}
        title={isPast ? 'Date dans le passé' : `Ajouter un repas - ${label}`}
      >
        + {label}
      </div>
    );
  } else {
    // Créneau avec un repas - élément draggable
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id: mealPlan.id,
      data: { mealPlan, fromSlot: slot },
      disabled: isPast,
    });

    const displayText = mealPlan.customNote || 
      (mealPlan.recipeId ? recipes.find(r => r.id === mealPlan.recipeId)?.title : null) || 
      label;

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: 'transform 250ms ease',
      cursor: isPast ? 'not-allowed' : 'grab',
      zIndex: 1000,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`p-2 rounded ${colorClass} border-2 border-transparent hover:border-gray-400 min-h-[60px] flex items-center justify-center text-center text-xs relative`}
        onClick={(e) => {
          if (isPast) return;
          e.stopPropagation();
          const confirmDelete = window.confirm(
            `Supprimer "${displayText}" du ${new Date(mealPlan.date).toLocaleDateString('fr-FR')} (${label}) ?`
          );
          if (confirmDelete) {
            onDeleteMeal(mealPlan.id);
          }
        }}
        title={`Cliquez pour supprimer: ${displayText}`}
      >
        <span className="truncate block">{displayText}</span>
      </div>
    );
  }
}
