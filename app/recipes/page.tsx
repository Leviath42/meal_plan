import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';

export default async function RecipesPage() {
  const all = await db.select().from(recipes).orderBy(desc(recipes.createdAt));

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Mes recettes</h1>
        <Link href="/recipes/new" className="bg-blue-600 text-white rounded px-4 py-2">+ Nouvelle</Link>
      </div>
      <ul className="divide-y">
        {all.map((r) => (
          <li key={r.id} className="py-3 flex justify-between">
            <span>{r.title}</span>
            <span className="text-gray-500 text-sm">{r.prepTime + r.cookTime} min · {r.defaultServings} pers.</span>
          </li>
        ))}
        {all.length === 0 && <li className="py-4 text-gray-500">Aucune recette — créez la première !</li>}
      </ul>
    </main>
  );
}