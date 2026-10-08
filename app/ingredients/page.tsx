import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import NewIngredientForm from './NewIngredientForm';
import IngredientsList from './IngredientsList';

export default async function IngredientsPage() {
  const all = await db.select().from(ingredients).orderBy(ingredients.name);

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-3">
          <h1 className="text-lg sm:text-xl font-bold">Ingrédients</h1>
        </div>
        <NewIngredientForm />
        <IngredientsList ingredients={all} />
      </div>
    </main>
  );
}
