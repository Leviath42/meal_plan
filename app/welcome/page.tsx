import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function WelcomePage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-lg sm:text-xl font-bold">Bienvenue, {session.user?.name ?? session.user?.email} 👋</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
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
        <Link href="/" className="inline-block bg-accent text-white rounded px-4 py-2 text-sm hover:bg-accent-hover transition-colors">
          Aller à mon planning
        </Link>
      </div>
    </main>
  );
}
