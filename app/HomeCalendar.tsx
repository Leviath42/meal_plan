'use client';

import Link from 'next/link';
import PlannerBoard from './components/PlannerBoard';
import type { Recipe } from '@/app/types/meal-plan';

interface HomeCalendarProps {
  recipes: Recipe[];
}

// Calendrier de la page d'accueil : 7 jours (J → J+6) en structure 1-3-3
export default function HomeCalendar({ recipes = [] }: HomeCalendarProps) {
  return (
    <PlannerBoard
      recipes={recipes}
      daysCount={7}
      enableMonthNavigation
      footer={
        <Link href="/calendar" className="text-sm text-accent hover:underline">
          Voir le calendrier complet →
        </Link>
      }
    />
  );
}
