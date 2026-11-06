import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { getCurrentHouseholdId } from '@/lib/auth-guards';
import { toLocalDateStr } from '@/lib/format';
import { listPantryItems } from './queries';
import PantryClient from './PantryClient';
import type { PantryItemView } from '@/lib/validators/pantry';

export default async function PantryPage() {
  // F17 (C-062) : catalogue et stock du FOYER de session uniquement
  const householdId = await getCurrentHouseholdId();
  // Catalogue pour la recherche d'ingrédient (SearchSelect partagé)
  const catalogIngredients = await db
    .select({ id: ingredients.id, name: ingredients.name, category: ingredients.category, defaultUnit: ingredients.defaultUnit })
    .from(ingredients)
    .where(eq(ingredients.householdId, householdId))
    .orderBy(asc(ingredients.name));

  // Stock du garde-manger, joint au catalogue (nom + rayon)
  const today = toLocalDateStr(new Date());
  const items: PantryItemView[] = listPantryItems(householdId).map((row) => ({
    id: row.id,
    ingredientId: row.ingredientId,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    expiresAt: row.expiresAt,
    // Périmé dès que la date de péremption est passée (ou du jour même :
    // la ligne doit être consommée ou retirée, l'alerte reste visible)
    expired: !!row.expiresAt && row.expiresAt <= today,
  }));

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <PantryClient items={items} catalogIngredients={catalogIngredients} />
      </div>
    </main>
  );
}
