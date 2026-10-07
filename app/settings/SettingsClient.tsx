'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { updateDefaultServings } from '@/app/actions/settings';

interface SettingsClientProps {
  role?: string | null;
  defaultServings: number;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
  GUEST: 'Invité (en attente de validation)',
};

// Page de paramétrage : seul l'administrateur peut modifier les paramètres,
// les autres membres les consultent en lecture seule.
export default function SettingsClient({ role, defaultServings }: SettingsClientProps) {
  const [servings, setServings] = useState<string>(String(defaultServings));
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAdmin = role === 'ADMIN';
  const roleLabel = role ? ROLE_LABELS[role] ?? role : 'Inconnu';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const value = parseInt(servings, 10);
    if (Number.isNaN(value)) {
      setFeedback({ success: false, message: 'Le nombre de couverts doit être un entier' });
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateDefaultServings(value);
        setFeedback({ success: result.success, message: result.message });
      } catch {
        setFeedback({ success: false, message: 'Une erreur est survenue lors de l\'enregistrement' });
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-800">Paramètres</h1>

      {/* Rôle de l'utilisateur connecté */}
      <div>
        <span className="text-sm text-gray-600">Votre rôle : </span>
        <span className="text-sm font-medium text-gray-800">{roleLabel}</span>
      </div>

      {/* Nombre de couverts par défaut */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="default-servings" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de couverts par défaut
          </label>
          <input
            id="default-servings"
            type="number"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            min="1"
            max="20"
            disabled={!isAdmin}
            className="w-full sm:w-32 p-2 border rounded bg-white text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Cette valeur pré-remplit le champ « Nombre de couverts » lorsqu'un repas est
            créé dans le calendrier.
          </p>
        </div>

        {isAdmin ? (
          <button
            type="submit"
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
            disabled={isPending}
          >
            {isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        ) : (
          <p className="text-xs text-gray-500">
            Seul un administrateur peut modifier ces paramètres.
          </p>
        )}

        {feedback && (
          <p className={`text-sm ${feedback.success ? 'text-green-600' : 'text-red-500'}`}>
            {feedback.message}
          </p>
        )}
      </form>

      {/* Thème : simple mention, la bascule vit dans la barre de navigation */}
      <div className="border-t border-gray-200 pt-3">
        <h2 className="text-sm font-medium text-gray-700 mb-1">Thème</h2>
        <p className="text-xs text-gray-500">
          Le thème clair ou sombre se règle via la bascule dans la barre de navigation.
        </p>
      </div>
    </div>
  );
}
