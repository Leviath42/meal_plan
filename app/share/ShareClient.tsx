'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createAccessToken,
  revokeAccessToken,
  type AccessTokenWithStatus,
} from '@/app/actions/tokens';

// Libellés des types de jeton pour l'affichage
const TYPE_LABELS: Record<string, string> = {
  calendar_read: 'Calendrier (lecture seule)',
  api: 'API (Home Assistant)',
};

// Formater une date stockée (ISO ou "YYYY-MM-DD HH:MM:SS" SQLite) en français
function formatDate(value: string): string {
  // SQLite CURRENT_TIMESTAMP produit "YYYY-MM-DD HH:MM:SS" en UTC sans fuseau
  const normalized = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  return new Date(normalized).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Bouton copier : copie l'URL complète dans le presse-papier et
// affiche une confirmation temporaire
function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponible (contexte non sécurisé) : rien à faire
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
    >
      {copied ? 'Copié !' : 'Copier'}
    </button>
  );
}

export default function ShareClient({ tokens }: { tokens: AccessTokenWithStatus[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as 'calendar_read' | 'api';
    const expiresInDays = Number(formData.get('expiresInDays'));

    const result = await createAccessToken(type, expiresInDays);

    if (result.success) {
      setMessage({
        type: 'success',
        text: `Jeton créé — il expire dans ${expiresInDays} jour${expiresInDays > 1 ? 's' : ''}.`,
      });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: result.message || 'Erreur lors de la création' });
    }
    setIsSubmitting(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Révoquer ce jeton ? Les liens associés cesseront immédiatement de fonctionner.')) {
      return;
    }
    setRevokingId(id);
    const result = await revokeAccessToken(id);
    if (result.success) {
      setMessage({ type: 'success', text: 'Jeton révoqué.' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: result.message || 'Erreur lors de la révocation' });
    }
    setRevokingId(null);
  };

  const statusBadge = (status: AccessTokenWithStatus['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const statusLabel = (status: AccessTokenWithStatus['status']) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'expired':
        return 'Expiré';
      default:
        return 'Révoqué';
    }
  };

  // Construire les URLs de partage (l'origine n'est connue que côté client)
  const buildUrl = (path: string, token: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${path}?token=${token}`;
  };

  return (
    <main className="px-3 sm:px-4 py-2 sm:py-3">
      <div className="max-w-4xl mx-auto">
        <div className="mb-3 px-2">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Partage du planning</h1>
          <p className="text-xs text-gray-500 mt-1">
            Créez des liens de partage en lecture seule, sans exposer de compte.
          </p>
        </div>

        {message && (
          <div
            className={`mb-3 px-3 py-2 rounded text-xs sm:text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Formulaire de création */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-3 max-w-2xl mx-auto">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
            Nouveau jeton
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label htmlFor="token-type" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                id="token-type"
                name="type"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="calendar_read">Calendrier (lecture seule)</option>
                <option value="api">API (Home Assistant)</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="token-duration" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Durée de validité
              </label>
              <select
                id="token-duration"
                name="expiresInDays"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="7">7 jours</option>
                <option value="30">30 jours</option>
                <option value="90">90 jours</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-accent text-white rounded px-3 py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Création...' : 'Créer le jeton'}
            </button>
          </form>
        </div>

        {/* Liste des jetons */}
        <div className="bg-white rounded-lg shadow-sm p-3 max-w-2xl mx-auto">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
            Jetons existants
          </h2>

          {tokens.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500">Aucun jeton créé pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="bg-gray-50 rounded-lg p-2 border border-gray-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(token.status)}`}
                        >
                          {statusLabel(token.status)}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {TYPE_LABELS[token.type] || token.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        Créé le {formatDate(token.createdAt)}
                        {token.createdByEmail ? ` par ${token.createdByEmail}` : ''}
                        {' — '}expire le {formatDate(token.expiresAt)}
                        {token.revokedAt ? ` — révoqué le ${formatDate(token.revokedAt)}` : ''}
                      </p>
                    </div>

                    <div className="flex gap-2 sm:ml-4">
                      {token.status === 'active' && (
                        <button
                          onClick={() => handleRevoke(token.id)}
                          disabled={revokingId === token.id}
                          className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded hover:bg-gray-100 transition-colors text-red-600 hover:text-red-800 disabled:opacity-50 whitespace-nowrap"
                        >
                          {revokingId === token.id ? '...' : 'Révoquer'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Liens prêts à copier pour les jetons actifs */}
                  {token.status === 'active' && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-28 flex-shrink-0">Page publique</span>
                        <code className="text-xs text-gray-600 truncate flex-1 bg-gray-100 rounded px-2 py-1">
                          /public/calendar?token={token.token.slice(0, 12)}…
                        </code>
                        <CopyButton url={buildUrl('/public/calendar', token.token)} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-28 flex-shrink-0">Export ICS</span>
                        <code className="text-xs text-gray-600 truncate flex-1 bg-gray-100 rounded px-2 py-1">
                          /api/calendar/ics?token={token.token.slice(0, 12)}…
                        </code>
                        <CopyButton url={buildUrl('/api/calendar/ics', token.token)} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-28 flex-shrink-0">API JSON</span>
                        <code className="text-xs text-gray-600 truncate flex-1 bg-gray-100 rounded px-2 py-1">
                          /api/calendar/public?token={token.token.slice(0, 12)}…
                        </code>
                        <CopyButton url={buildUrl('/api/calendar/public', token.token)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
