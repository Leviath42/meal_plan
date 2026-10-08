import Link from 'next/link';
import { getAppSettings } from '@/app/actions/settings';
import GeneratorClient from './GeneratorClient';

// Page du générateur de menus : formulaire paramétrable, accessible depuis
// le calendrier (bouton « Générer un menu… » dans la barre du mois).
export default async function GeneratorPage() {
  // Nombre de couverts par défaut (page de paramétrage) — la garde de
  // session est assurée par getAppSettings (les pages sont aussi protégées
  // par le middleware)
  const settings = await getAppSettings();

  return (
    <main className="px-3 sm:px-6 py-2 sm:py-3 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h1 className="text-base sm:text-lg font-bold text-gray-800">
            Générer un menu
          </h1>
          <Link
            href="/calendar"
            className="px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-xs"
          >
            Retour au calendrier
          </Link>
        </div>
        <GeneratorClient defaultServings={settings.defaultServings} />
      </div>
    </main>
  );
}
