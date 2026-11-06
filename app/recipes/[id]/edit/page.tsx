import { db } from '@/lib/db';
import { recipes, ingredients, recipeIngredients } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getCurrentHouseholdId } from '@/lib/auth-guards';
import { notFound } from 'next/navigation';
import { getIngredientStandardsMap } from '@/lib/standards';
import EditRecipeForm from './EditRecipeForm';

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // F17 (C-062) : édition bornée au FOYER de session — introuvable ailleurs
  const householdId = await getCurrentHouseholdId();
  // Récupérer la recette
  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.householdId, householdId)));

  if (!recipe) {
    notFound();
  }

  // Récupérer tous les ingrédients pour le sélecteur
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

  // Récupérer les ingrédients de la recette
  const recipeIngs = await db
    .select({
      ingredientId: recipeIngredients.ingredientId,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
      note: recipeIngredients.note,
    })
    .from(recipeIngredients)
    .where(and(eq(recipeIngredients.recipeId, id), eq(recipeIngredients.householdId, householdId)));

  // F16 : quantités standard des ingrédients (pré-remplissage par couverts)
  const standards = await getIngredientStandardsMap(householdId);

  return (
    <EditRecipeForm
      recipe={recipe}
      availableIngredients={allIngredients}
      categories={categories}
      existingIngredients={recipeIngs}
      standards={standards}
    />
  );
}
