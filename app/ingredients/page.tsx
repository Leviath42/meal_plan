import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import NewIngredientForm from './NewIngredientForm';
import IngredientRow from './IngredientRow';

export default async function IngredientsPage() {
  const all = await db.select().from(ingredients).orderBy(ingredients.name);

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Ingrédients</h1>
      </div>
      <NewIngredientForm />
      <ul className="divide-y">
        {all.map((i) => (
          <IngredientRow key={i.id} {...i} />
        ))}
        {all.length === 0 && <li className="py-4 text-gray-500">Aucun ingrédient — ajoutez-en un !</li>}
      </ul>
    </main>
  );
}
