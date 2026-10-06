import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import NewIngredientForm from './NewIngredientForm';
import IngredientRow from './IngredientRow';

export default async function IngredientsPage() {
  const all = await db.select().from(ingredients).orderBy(ingredients.name);

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-full mx-auto">
        <div className="mb-3">
          <h1 className="text-lg sm:text-xl font-bold">Ingrédients</h1>
        </div>
        <NewIngredientForm />
        <ul className="divide-y border-t border-b border-gray-200">
          {all.map((i) => (
            <IngredientRow key={i.id} {...i} />
          ))}
          {all.length === 0 && <li className="py-4 text-xs sm:text-sm text-gray-500 text-center">Aucun ingrédient — ajoutez-en un !</li>}
        </ul>
      </div>
    </main>
  );
}
