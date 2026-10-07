import { db } from '@/lib/db';
import { ingredients, shoppingItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import ShoppingListClient from './ShoppingListClient';
import type { ShoppingItemView } from '@/lib/validators/shopping';

export default async function ShoppingListPage() {
  // Articles de la liste avec le nom et le rayon de l'ingrédient lié
  // (les articles manuels n'ont pas d'ingrédient : nom libre, rayon « Divers »)
  const rows = await db
    .select({
      id: shoppingItems.id,
      quantity: shoppingItems.quantity,
      unit: shoppingItems.unit,
      isBought: shoppingItems.isBought,
      addedManually: shoppingItems.addedManually,
      manualName: shoppingItems.manualName,
      ingredientName: ingredients.name,
      category: ingredients.category,
    })
    .from(shoppingItems)
    .leftJoin(ingredients, eq(shoppingItems.ingredientId, ingredients.id));

  const items: ShoppingItemView[] = rows.map((row) => ({
    id: row.id,
    name: row.ingredientName ?? row.manualName ?? 'Article',
    category: row.category ?? 'Divers',
    quantity: row.quantity,
    unit: row.unit,
    isBought: row.isBought,
    addedManually: row.addedManually,
  }));

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-3">
          <h1 className="text-lg sm:text-xl font-bold">Liste de courses</h1>
        </div>
        <ShoppingListClient items={items} />
      </div>
    </main>
  );
}
