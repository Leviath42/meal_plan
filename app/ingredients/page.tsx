import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import { getCurrentHouseholdId } from '@/lib/auth-guards';
import NewIngredientPanel from './NewIngredientPanel';
import IngredientsList from './IngredientsList';

export default async function IngredientsPage() {
  // F17 (C-062) : catalogue du FOYER de session uniquement
  const householdId = await getCurrentHouseholdId();
  const all = await db.select().from(ingredients).where(eq(ingredients.householdId, householdId)).orderBy(ingredients.name);

  // Rayons existants pour la liste déroulante de création
  const categoryRows = await db
    .selectDistinct({ category: ingredients.category })
    .from(ingredients)
    .where(eq(ingredients.householdId, householdId))
    .orderBy(ingredients.category);
  const categories = categoryRows
    .map((row) => row.category)
    .filter((category) => category && category.trim() !== '');

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <NewIngredientPanel categories={categories} />
        <IngredientsList ingredients={all} />
      </div>
    </main>
  );
}
