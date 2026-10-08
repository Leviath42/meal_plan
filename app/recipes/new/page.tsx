import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import { NewRecipeForm } from './NewRecipeForm';

export default async function NewRecipePage() {
  // Récupérer tous les ingrédients pour le sélecteur
  const allIngredients = await db.select().from(ingredients).orderBy(ingredients.name);

  // Rayons existants pour la création rapide d'ingrédient
  const categoryRows = await db
    .selectDistinct({ category: ingredients.category })
    .from(ingredients)
    .orderBy(ingredients.category);
  const categories = categoryRows
    .map((row) => row.category)
    .filter((category) => category && category.trim() !== '');

  return <NewRecipeForm availableIngredients={allIngredients} categories={categories} />;
}
