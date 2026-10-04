import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';
import DeleteRecipeButton from './DeleteRecipeButton';

export default async function RecipesPage() {
  const all = await db.select().from(recipes).orderBy(desc(recipes.createdAt));

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Mes recettes</h1>
        <Link href="/recipes/new" className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition-colors">
          + Nouvelle recette
        </Link>
      </div>
      
      {all.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucune recette — créez la première !</p>
          <Link href="/recipes/new" className="text-blue-600 hover:underline mt-2 inline-block">
            Ajouter une recette
          </Link>
        </div>
      ) : (
        <ul className="divide-y border rounded-lg">
          {all.map((r) => {
            const totalTime = r.prepTime + r.cookTime;
            return (
              <li key={r.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <Link
                      href={`/recipes/${r.id}`}
                      className="text-lg font-semibold text-blue-600 hover:underline"
                    >
                      {r.title}
                    </Link>
                    <div className="text-sm text-gray-500 mt-1">
                      <span>{totalTime} min</span>
                      {r.defaultServings > 0 && (
                        <span className="mx-2">·</span>
                      )}
                      <span>{r.defaultServings} pers.</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/recipes/${r.id}/edit`}
                      className="text-sm bg-gray-100 text-gray-700 rounded px-3 py-1 hover:bg-gray-200 transition-colors"
                    >
                      Modifier
                    </Link>
                    <DeleteRecipeButton id={r.id} title={r.title} />
                  </div>
                </div>
                {r.description && (
                  <p className="text-sm text-gray-600 mt-2">{r.description}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
