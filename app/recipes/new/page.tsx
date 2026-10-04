import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import { NewRecipeForm } from './NewRecipeForm';

export default async function NewRecipePage() {
  // Récupérer tous les ingrédients pour le sélecteur
  const allIngredients = await db.select().from(ingredients).orderBy(ingredients.name);

  return <NewRecipeForm availableIngredients={allIngredients} />;
}
