import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';
import DeleteRecipeButton from './DeleteRecipeButton';

export default async function RecipesPage() {
  const all = await db.select().from(recipes).orderBy(desc(recipes.createdAt));

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
          <h1 className="text-lg sm:text-xl font-bold">Mes recettes</h1>
          <Link href="/recipes/new" className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent-hover transition-colors whitespace-nowrap">
            + Nouvelle recette
          </Link>
        </div>
        
        {all.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs sm:text-sm text-gray-500">Aucune recette — créez la première !</p>
            <Link href="/recipes/new" className="text-accent hover:underline mt-2 inline-block text-xs sm:text-sm">
              Ajouter une recette
            </Link>
          </div>
        ) : (
          <ul className="divide-y border rounded-lg overflow-hidden max-w-2xl mx-auto">
            {all.map((r) => {
              const totalTime = r.prepTime + r.cookTime;
              return (
                <li key={r.id} className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/recipes/${r.id}`}
                        className="text-sm sm:text-base font-semibold text-accent hover:underline truncate block"
                      >
                        {r.title}
                      </Link>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">
                        <span>{totalTime} min</span>
                        {r.defaultServings > 0 && (
                          <>
                            <span className="mx-1">·</span>
                            <span>{r.defaultServings} pers.</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link
                        href={`/recipes/${r.id}/edit`}
                        className="text-xs sm:text-sm bg-gray-100 text-gray-700 rounded px-2 sm:px-3 py-1 hover:bg-gray-200 transition-colors whitespace-nowrap"
                      >
                        Modifier
                      </Link>
                      <DeleteRecipeButton id={r.id} title={r.title} />
                    </div>
                  </div>
                  {r.description && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-2">{r.description}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
