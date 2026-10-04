import { db } from '@/lib/db';
import { recipes, ingredients, recipeIngredients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import EditRecipeForm from './EditRecipeForm';

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Récupérer la recette
  const [recipe] = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, id));

  if (!recipe) {
    notFound();
  }

  // Récupérer tous les ingrédients pour le sélecteur
  const allIngredients = await db.select().from(ingredients).orderBy(ingredients.name);

  // Récupérer les ingrédients de la recette
  const recipeIngs = await db
    .select({
      ingredientId: recipeIngredients.ingredientId,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
      note: recipeIngredients.note,
    })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, id));

  return (
    <EditRecipeForm
      recipe={recipe}
      availableIngredients={allIngredients}
      existingIngredients={recipeIngs}
    />
  );
}
