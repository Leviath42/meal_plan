'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { updateDefaultServings, updateMinDaysBetween } from '@/app/actions/settings';

interface SettingsClientProps {
  role?: string | null;
  defaultServings: number;
  // Antidoublon (F09) : intervalle minimum de l'utilisateur connecté
  minDaysBetween: number;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
  GUEST: 'Invité (en attente de validation)',
};

// Page de paramétrage : seul l'administrateur peut modifier les paramètres,
// les autres membres les consultent en lecture seule.
export default function SettingsClient({ role, defaultServings, minDaysBetween }: SettingsClientProps) {
  const [servings, setServings] = useState<string>(String(defaultServings));
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  // Antidoublon (F09) : préférence personnelle de l'utilisateur
  const [minDays, setMinDays] = useState<string>(String(minDaysBetween));
  const [minDaysFeedback, setMinDaysFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isMinDaysPending, startMinDaysTransition] = useTransition();

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

  // Enregistrer l'intervalle antidoublon (F09)
  const handleMinDaysSubmit = (event: FormEvent) => {
    event.preventDefault();

    const value = parseInt(minDays, 10);
    if (Number.isNaN(value)) {
      setMinDaysFeedback({ success: false, message: 'L\'intervalle doit être un nombre entier de jours' });
      return;
    }

    startMinDaysTransition(async () => {
      try {
        const result = await updateMinDaysBetween(value);
        setMinDaysFeedback({ success: result.success, message: result.message });
      } catch {
        setMinDaysFeedback({ success: false, message: 'Une erreur est survenue lors de l\'enregistrement' });
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

      {/* Mes préférences : intervalle antidoublon (F09) */}
      <form onSubmit={handleMinDaysSubmit} className="border-t border-gray-200 pt-3 space-y-3">
        <h2 className="text-sm font-medium text-gray-700">Mes préférences</h2>
        <div>
          <label htmlFor="min-days-between" className="block text-sm font-medium text-gray-700 mb-1">
            Intervalle minimum entre deux plans de la même recette (jours)
          </label>
          <input
            id="min-days-between"
            type="number"
            value={minDays}
            onChange={(e) => setMinDays(e.target.value)}
            min="0"
            max="60"
            className="w-full sm:w-32 p-2 border rounded bg-white text-gray-800"
          />
          <p className="text-xs text-gray-500 mt-1">
            Une recette ne peut pas être replanifiée à moins de ce nombre de jours
            d'une autre planification. 0 = contrôle désactivé (défaut : 7 jours).
          </p>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
          disabled={isMinDaysPending}
        >
          {isMinDaysPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        {minDaysFeedback && (
          <p className={`text-sm ${minDaysFeedback.success ? 'text-green-600' : 'text-red-500'}`}>
            {minDaysFeedback.message}
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
