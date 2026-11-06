// F12 — page de secours hors-ligne (précachée par le service worker, publique :
// le SW la sert quand une page jamais visitée est demandée sans réseau).
import Link from 'next/link';
export default function OfflinePage() {
  return (
    <main className="px-3 sm:px-6 py-2 sm:py-3">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-4 text-center">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Vous êtes hors-ligne</h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-1">
          Aucune connexion. Les pages déjà visitées (calendrier, recettes) restent consultables
          depuis le cache — mais cette page doit d&apos;abord être enregistrée en ligne.
        </p>
        <p className="text-xs sm:text-sm text-gray-600 mb-3">
          Les modifications sont impossibles hors-ligne : reconnectez-vous pour ajouter un repas,
          créer une recette ou cocher la liste de courses.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/" className="bg-accent text-white rounded px-4 py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors">
            Réessayer
          </Link>
        </div>
      </div>
    </main>
  );
}
