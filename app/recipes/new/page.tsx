import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import { getIngredientStandardsMap } from '@/lib/standards';
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

  // F16 : quantités standard des ingrédients (pré-remplissage par couverts)
  const standards = await getIngredientStandardsMap();

  return <NewRecipeForm availableIngredients={allIngredients} categories={categories} standards={standards} />;
}
