import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { ingredients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentHouseholdId } from '@/lib/auth-guards';
import { multiHouseholdsEnabled } from '@/lib/household';
import { seedHouseholdCatalog } from '@/app/actions/ingredients';

export default async function WelcomePage() {
  const session = await auth();
  if (!session) redirect('/login');

  // F17 (C-062, contrat 4b §1.4) : en mode MULTI_HOUSEHOLDS=ON, l'inscription
  // a créé un foyer NEUF avec un catalogue vide — bouton « remplir le
  // catalogue » (bibliothèque de référence, scripts/seed-ingredients.ts en
  // mode ciblé par foyer). En mode OFF (défaut), rien ne change.
  const householdId = await getCurrentHouseholdId();
  const emptyCatalogue =
    multiHouseholdsEnabled() &&
    (
      await db
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(eq(ingredients.householdId, householdId))
        .limit(1)
    ).length === 0;

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-lg sm:text-xl font-bold">Bienvenue, {session.user?.name ?? session.user?.email} 👋</h1>
        <p className="text-sm text-gray-600">
          Votre compte est actif. Trois écrans pour démarrer :
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/recipes/new" className="text-accent hover:underline font-medium">1. Créez votre première recette</Link>
            <span className="text-gray-500"> — ou importez-en une depuis une URL (Marmiton, 750g…)</span>
          </li>
          <li>
            <Link href="/calendar" className="text-accent hover:underline font-medium">2. Planifiez la semaine</Link>
            <span className="text-gray-500"> — glissez une recette dans un créneau</span>
          </li>
          <li>
            <Link href="/shopping-list" className="text-accent hover:underline font-medium">3. Générez la liste de courses</Link>
            <span className="text-gray-500"> — depuis le planning, par rayon de supermarché</span>
          </li>
        </ul>

        {emptyCatalogue && (
          <div className="border border-accent rounded-lg p-3 space-y-2">
            <p className="text-sm text-gray-600">
              Votre foyer démarre avec un catalogue d&apos;ingrédients vide. Ajoutez la bibliothèque de référence (~250 ingrédients classés par rayon) en un clic :
            </p>
            <form action={seedHouseholdCatalog}>
              <button
                type="submit"
                className="bg-accent text-white rounded px-4 py-2 text-sm hover:bg-accent-hover transition-colors"
              >
                Remplir mon catalogue d&apos;ingrédients
              </button>
            </form>
          </div>
        )}

        <Link href="/" className="inline-block bg-accent text-white rounded px-4 py-2 text-sm hover:bg-accent-hover transition-colors">
          Aller à mon planning
        </Link>
      </div>
    </main>
  );
}
