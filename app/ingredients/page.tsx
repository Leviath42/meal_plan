import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import NewIngredientPanel from './NewIngredientPanel';
import IngredientsList from './IngredientsList';

export default async function IngredientsPage() {
  const all = await db.select().from(ingredients).orderBy(ingredients.name);

  // Rayons existants pour la liste déroulante de création
  const categoryRows = await db
    .selectDistinct({ category: ingredients.category })
    .from(ingredients)
    .orderBy(ingredients.category);
  const categories = categoryRows
    .map((row) => row.category)
    .filter((category) => category && category.trim() !== '');

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-3">
          <h1 className="text-lg sm:text-xl font-bold">Ingrédients</h1>
        </div>
        <NewIngredientPanel categories={categories} />
        <IngredientsList ingredients={all} />
      </div>
    </main>
  );
}
