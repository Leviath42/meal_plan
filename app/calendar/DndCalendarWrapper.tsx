'use client';

import { DndContext, DragEndEvent, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import CalendarClient from './CalendarClient';
import type { MealPlan, Recipe } from '@/app/types/meal-plan';

// Composant pour afficher le repas pendant le drag
const DragOverlayComponent = ({ item }: { item: { mealPlan: MealPlan } | null }) => {
  if (!item?.mealPlan) return null;

  // Trouver le type de repas pour la couleur
  const MEAL_TYPES: { id: string; label: string; color: string; shortLabel: string }[] = [
    { id: 'breakfast', label: 'Petit-déjeuner', color: 'bg-orange-100 text-orange-800', shortLabel: 'Petit-déj' },
    { id: 'lunch', label: 'Déjeuner', color: 'bg-blue-100 text-blue-800', shortLabel: 'Déjeuner' },
    { id: 'snack', label: 'Goûter', color: 'bg-green-100 text-green-800', shortLabel: 'Goûter' },
    { id: 'dinner', label: 'Dîner', color: 'bg-purple-100 text-purple-800', shortLabel: 'Dîner' },
  ];

  const mealType = MEAL_TYPES.find(mt => mt.id === item.mealPlan.mealType) || MEAL_TYPES[0];
  const displayText = item.mealPlan.customNote || 'Repas';

  return (
    <div 
      className={`p-2 rounded ${mealType.color} shadow-lg border-2 border-gray-400 cursor-grabbing`}
      style={{
        transform: 'scale(1.05)',
        zIndex: 9999,
      }}
    >
      <span className="text-xs truncate block max-w-[200px]">{displayText}</span>
    </div>
  );
};

// Type pour l'événement de drag end
interface DndCalendarWrapperProps {
  recipes: Recipe[];
}

export default function DndCalendarWrapper({ recipes }: DndCalendarWrapperProps) {
  const [activeItem, setActiveItem] = useState<any>(null);
  
  // Sensors pour mouse et keyboard
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Gestion du drag
  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
  };

  const handleDragCancel = () => {
    setActiveItem(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <CalendarClient recipes={recipes} />
      
      {/* Overlay pendant le drag */}
      <DragOverlay dropAnimation={null}>
        {activeItem && <DragOverlayComponent item={activeItem} />}
      </DragOverlay>
    </DndContext>
  );
}
