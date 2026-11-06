import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getCurrentHouseholdId } from '@/lib/auth-guards';
import Link from 'next/link';
import RecipesClient from './RecipesClient';

export default async function RecipesPage() {
  // F17 (C-062) : recettes du FOYER de session uniquement
  const householdId = await getCurrentHouseholdId();
  const all = await db.select({
    id: recipes.id,
    title: recipes.title,
    description: recipes.description,
    prepTime: recipes.prepTime,
    cookTime: recipes.cookTime,
    defaultServings: recipes.defaultServings,
    mealCourse: recipes.mealCourse,
    tags: recipes.tags,
    createdAt: recipes.createdAt,
  }).from(recipes).where(eq(recipes.householdId, householdId)).orderBy(desc(recipes.createdAt));

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
          <h1 className="text-lg sm:text-xl font-bold">Mes recettes</h1>
          <Link href="/recipes/new" className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent-hover transition-colors whitespace-nowrap">
            + Nouvelle recette
          </Link>
          <Link href="/recipes/import" className="rounded border border-accent text-accent px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent hover:text-white transition-colors whitespace-nowrap">
            Importer une URL
          </Link>
        </div>
        <RecipesClient recipes={all} />
      </div>
    </main>
  );
}
