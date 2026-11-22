'use client';

import { useActionState, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { updateDefaultServings, updateMinDaysBetween, updateTheme } from '@/app/actions/settings';
import { importAllData } from '@/app/actions/export';
import { THEMES, themeMealColors } from '@/lib/themes';

interface SettingsClientProps {
  role?: string | null;
  defaultServings: number;
  // Antidoublon (F09) : intervalle minimum de l'utilisateur connecté
  minDaysBetween: number;
  // Palette de couleurs (F14) : id du thème actif
  theme: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
  GUEST: 'Invité (en attente de validation)',
};

const ROLE_BADGES: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  MEMBER: 'bg-green-100 text-green-800',
  GUEST: 'bg-yellow-100 text-yellow-800',
};

// Cartoule de section : titre + contenu aéré, texte lisible (text-sm).
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsClient({ role, defaultServings, minDaysBetween, theme }: SettingsClientProps) {
  const [servings, setServings] = useState<string>(String(defaultServings));
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [minDays, setMinDays] = useState<string>(String(minDaysBetween));
  const [themeId, setThemeId] = useState<string>(theme);
  const [themeFeedback, setThemeFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [themePending, startThemeTransition] = useTransition();
  const [minDaysFeedback, setMinDaysFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isMinDaysPending, startMinDaysTransition] = useTransition();
  const [importState, importFormAction, isImportPending] = useActionState(importAllData, null);

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
        setFeedback({ success: false, message: "Une erreur est survenue lors de l'enregistrement" });
      }
    });
  };

  const handleThemeChange = (id: string) => {
    setThemeId(id);
    startThemeTransition(async () => {
      try {
        const result = await updateTheme(id);
        setThemeFeedback({ success: result.success, message: result.message });
      } catch {
        setThemeFeedback({ success: false, message: "Une erreur est survenue lors de l'enregistrement" });
      }
    });
  };

  const handleMinDaysSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = parseInt(minDays, 10);
    if (Number.isNaN(value)) {
      setMinDaysFeedback({ success: false, message: "L'intervalle doit être un nombre entier de jours" });
      return;
    }
    startMinDaysTransition(async () => {
      try {
        const result = await updateMinDaysBetween(value);
        setMinDaysFeedback({ success: result.success, message: result.message });
      } catch {
        setMinDaysFeedback({ success: false, message: "Une erreur est survenue lors de l'enregistrement" });
      }
    });
  };

  // Sections de liens : on ne montre à chacun que ce dont il a les droits.
  const accountLinks = (
    <div className="flex flex-wrap gap-x-5 gap-y-1">
      <Link href="/profile" className="text-sm text-accent hover:underline">Profil</Link>
    </div>
  );

  const householdLinks = (
    <div className="flex flex-wrap gap-x-5 gap-y-1">
      <Link href="/register" className="text-sm text-accent hover:underline">Utilisateurs</Link>
      <Link href="/share" className="text-sm text-accent hover:underline">Partage</Link>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg sm:text-xl font-bold text-gray-800">Paramètres</h1>

      {/* Compte : visible de tous */}
      <Section title="Compte">
        <div>
          <span className="text-sm text-gray-600">Votre rôle : </span>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGES[role ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
            {roleLabel}
          </span>
        </div>
        {accountLinks}
      </Section>

      {/* Mes préférences : personnelles, visible de tous */}
      <Section title="Mes préférences">
        <form onSubmit={handleMinDaysSubmit} className="space-y-3">
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
              d&apos;une autre planification. 0 = contrôle désactivé (défaut : 7 jours).
            </p>
          </div>
          <button type="submit" className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover text-sm" disabled={isMinDaysPending}>
            {isMinDaysPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {minDaysFeedback && (
            <p className={`text-sm ${minDaysFeedback.success ? 'text-green-600' : 'text-red-500'}`}>
              {minDaysFeedback.message}
            </p>
          )}
        </form>
      </Section>

      {/* Apparence : palette = choix du foyer, réservé à l'admin */}
      <Section title="Apparence">
        <p className="text-xs text-gray-500">
          Le mode clair ou sombre se règle via la bascule dans la barre de navigation.
        </p>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">Palette de couleurs</h3>
          <p className="text-xs text-gray-500 mb-2">
            La palette teinte les boutons, liens et étiquettes du calendrier (mode clair et sombre).
          </p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((themeDef) => {
              const colors = themeMealColors(themeDef);
              const isCurrent = themeId === themeDef.id;
              return (
                <button
                  key={themeDef.id}
                  type="button"
                  onClick={() => isAdmin && handleThemeChange(themeDef.id)}
                  disabled={!isAdmin || themePending}
                  aria-pressed={isCurrent}
                  className={`rounded-lg border-2 p-2 text-left transition-colors ${
                    isCurrent ? 'border-accent' : 'border-gray-200 hover:border-gray-300'
                  } ${!isAdmin ? 'cursor-default' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-5 h-5 rounded-full border border-gray-300"
                      style={{ backgroundColor: themeDef.swatch }}
                      aria-hidden="true"
                    />
                    <span className={`text-xs font-medium ${isCurrent ? 'text-accent' : 'text-gray-700'}`}>
                      {themeDef.label}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-wrap max-w-[220px]">
                    {(['breakfast', 'lunch', 'snack', 'dinner'] as const).map((mealType) => (
                      <span key={mealType} className={`px-1.5 py-0.5 rounded-full text-[10px] ${colors[mealType]}`}>
                        {{ breakfast: 'Petit-déj', lunch: 'Déjeuner', snack: 'Goûter', dinner: 'Dîner' }[mealType]}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          {themeFeedback && (
            <p className={`text-sm mt-2 ${themeFeedback.success ? 'text-green-600' : 'text-red-500'}`}>
              {themeFeedback.message}
            </p>
          )}
        </div>
      </Section>

      {/* Foyer : réglages du foyer, ADMIN uniquement */}
      {isAdmin && (
        <Section title="Foyer">
          {householdLinks}
          <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-100 pt-3">
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
                className="w-full sm:w-32 p-2 border rounded bg-white text-gray-800"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cette valeur pré-remplit le champ « Nombre de couverts » lorsqu&apos;un repas est
                créé dans le calendrier.
              </p>
            </div>
            <button type="submit" className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover text-sm" disabled={isPending}>
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {feedback && (
              <p className={`text-sm ${feedback.success ? 'text-green-600' : 'text-red-500'}`}>
                {feedback.message}
              </p>
            )}
          </form>
        </Section>
      )}

      {/* Système : export/import + mise à jour, ADMIN uniquement */}
      {isAdmin && (
        <Section title="Système">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-700">Exporter les données</h3>
            <p className="text-xs text-gray-500">
              Télécharge tout le foyer en un fichier JSON : recettes, ingrédients, planning,
              garde-manger et paramètres. Aucun mot de passe, jeton ni clé de licence n&apos;est inclus.
            </p>
            <a href="/settings/export" download className="inline-block px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover text-sm">
              Exporter (JSON)
            </a>
          </div>

          <form action={importFormAction} className="space-y-2 border-t border-gray-100 pt-3" encType="multipart/form-data">
            <h3 className="text-sm font-medium text-gray-700">Importer un fichier</h3>
            <p className="text-xs text-gray-500">
              Restaure un fichier d&apos;export précédent. Tout se passe en une seule
              transaction : en cas d&apos;erreur, rien n&apos;est écrit. Les recettes déjà
              présentes ne sont jamais écrasées (doublons suffixés «&nbsp;(2)&nbsp;»).
            </p>
            <input
              id="import-file"
              type="file"
              name="file"
              accept="application/json,.json"
              required
              disabled={isImportPending}
              className="block w-full text-sm text-gray-700 border rounded p-2 bg-white file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-gray-100 file:text-gray-700"
            />
            <button type="submit" className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover text-sm" disabled={isImportPending}>
              {isImportPending ? 'Import en cours...' : 'Importer'}
            </button>
            {!isImportPending && importState?.message && (
              <p className={`text-sm ${importState.success ? 'text-green-600' : 'text-red-500'}`}>
                {importState.message}
              </p>
            )}
          </form>

          <div className="border-t border-gray-100 pt-3">
            <Link href="/deploy" className="text-sm text-accent hover:underline">Mettre à jour l&apos;application</Link>
          </div>
        </Section>
      )}
    </div>
  );
}
