import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import { getCurrentHouseholdId } from '@/lib/auth-guards';
import { getIngredientStandardsMap } from '@/lib/standards';
import { NewRecipeForm } from './NewRecipeForm';

export default async function NewRecipePage() {
  // F17 (C-062) : catalogue et standards du FOYER de session uniquement
  const householdId = await getCurrentHouseholdId();
  const allIngredients = await db.select().from(ingredients).where(eq(ingredients.householdId, householdId)).orderBy(ingredients.name);

  // Rayons existants pour la création rapide d'ingrédient
  const categoryRows = await db
    .selectDistinct({ category: ingredients.category })
    .from(ingredients)
    .where(eq(ingredients.householdId, householdId))
    .orderBy(ingredients.category);
  const categories = categoryRows
    .map((row) => row.category)
    .filter((category) => category && category.trim() !== '');

  // F16 : quantités standard des ingrédients (pré-remplissage par couverts)
  const standards = await getIngredientStandardsMap(householdId);

  return <NewRecipeForm availableIngredients={allIngredients} categories={categories} standards={standards} />;
}
