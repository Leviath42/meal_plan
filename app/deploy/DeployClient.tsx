'use client';

// app/deploy/DeployClient.tsx
// Pilotage du déploiement depuis l'application : version chargée,
// mise à jour (update.sh, branche configurée sur le serveur) et retour
// arrière (update.sh rollback).
// Le statut est rafraîchi par polling — pendant la mise à jour, le serveur
// redémarre : les requêtes échouent temporairement, on continue de poller.

import { useCallback, useEffect, useState } from 'react';
import {
  getDeployStatus,
  triggerDeploy,
  type CommitSummary,
  type DeployStatus,
} from '@/app/actions/deploy';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function CommitHistory({ commits, current }: { commits: CommitSummary[]; current: string | null }) {
  if (commits.length === 0) return null;
  return (
    <ul className="space-y-1">
      {commits.map((commit) => {
        const isCurrent = current !== null && commit.hash.startsWith(current);
        return (
          <li
            key={commit.hash}
            className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs ${
              isCurrent ? 'font-semibold text-gray-800' : 'text-gray-500'
            }`}
          >
            <span className="font-mono">{commit.hash}</span>
            <span className="max-w-full truncate">{commit.subject}</span>
            {isCurrent && (
              <span className="text-[10px] uppercase tracking-wide text-green-700">
                (chargé)
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface DeployClientProps {
  role?: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return iso;
  }
}

function CommitDetail({ status }: { status: DeployStatus }) {
  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">
        Commit :{' '}
        <span className="font-mono font-medium text-gray-800">
          {status.currentCommit ?? 'inconnu'}
        </span>
        {status.commitAuthor && <span> — {status.commitAuthor}</span>}
      </div>
      {status.commitSubject && (
        <div className="text-sm font-medium text-gray-800 bg-gray-100 rounded p-2">
          {status.commitSubject}
        </div>
      )}
      {status.commitBody && (
        <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 whitespace-pre-wrap font-sans">
          {status.commitBody}
        </pre>
      )}
      {status.commitDate && (
        <div className="text-xs text-gray-500">
          Daté du {formatDateTime(status.commitDate)}
        </div>
      )}
    </div>
  );
}

export default function DeployClient({ role }: DeployClientProps) {
  const [status, setStatus] = useState<DeployStatus | null>(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [confirming, setConfirming] = useState<'update' | 'rollback' | null>(null);

  const isAdmin = role === 'ADMIN';

  const poll = useCallback(async () => {
    try {
      const next = await getDeployStatus();
      setStatus(next);
      setConnectionLost(false);
    } catch {
      setConnectionLost(true);
    }
  }, []);

  // Polling adaptatif : serré pendant un déploiement (le journal doit
  // défiler), espacé au repos (l'état ne change pas) — chaque poll lit des
  // fichiers et interroge git côté serveur, autant les économiser.
  useEffect(() => {
    poll();
    const timer = setInterval(poll, status?.running ? 1500 : 30000);
    return () => clearInterval(timer);
  }, [poll, status?.running]);

  const handleTrigger = (mode: 'update' | 'rollback') => {
    setConfirming(null);
    setFeedback({ success: true, message: 'Déclenchement en cours...' });
    triggerDeploy(mode)
      .then((result) => {
        setFeedback({ success: result.success, message: result.message });
        poll();
      })
      .catch(() => {
        setFeedback({
          success: false,
          message: "Échec de l'appel au serveur — réessayez",
        });
      });
  };

  const running = status?.running ?? false;
  const lastRunLabel =
    status?.mode === 'rollback' ? 'Retour arrière' : status?.mode === 'update' ? 'Mise à jour' : '—';

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-800">Déploiement</h1>

      {/* Version chargée */}
      {status ? (
        <>
          <CommitDetail status={status} />
          <div className="text-sm text-gray-600">
            Build : <span className="font-mono text-gray-800">{status.buildId ?? 'inconnu'}</span>
          </div>
      {/* Commandes : ADMIN uniquement */}
      {isAdmin ? (
        <div className="border-t border-gray-200 pt-3 space-y-3">
          <h2 className="text-sm font-medium text-gray-700">Actions</h2>

          {!confirming && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
                disabled={running}
                onClick={() => setConfirming('update')}
              >
                {running ? 'Déploiement en cours...' : 'Mettre à jour depuis GitHub'}
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                disabled={running}
                onClick={() => setConfirming('rollback')}
              >
                Retour arrière (dernière sauvegarde de la base)
              </button>
            </div>
          )}

          {confirming && (
            <div className="space-y-2 rounded border border-gray-300 p-3">
              <p className="text-sm text-gray-700">
                {confirming === 'update'
                  ? "Mettre à jour l'application depuis GitHub (branche configurée sur ce serveur : beta pour le conteneur de test, main pour la production) ? Une sauvegarde de la base est faite avant, le serveur redémarre pendant l'opération."
                  : "Restaurer la dernière sauvegarde de la base ? Les données créées depuis cette sauvegarde seront perdues. Le code reste à la version courante (retour arrière des données uniquement)."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
                  onClick={() => handleTrigger(confirming)}
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  onClick={() => setConfirming(null)}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {feedback && (
            <p className={`text-sm ${feedback.success ? 'text-green-600' : 'text-red-500'}`}>
              {feedback.message}
            </p>
          )}
        </div>
      ) : (
        <p className="border-t border-gray-200 pt-3 text-xs text-gray-500">
          Seul un administrateur peut déclencher une mise à jour ou un retour arrière.
        </p>
      )}

          <div className="border-t border-gray-200 pt-3">
            <h2 className="text-sm font-medium text-gray-700 mb-2">
              Historique récent (HEAD en haut)
            </h2>
            <CommitHistory commits={status.recentCommits} current={status.currentCommit} />
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">Chargement de l'état...</p>
      )}

      {/* État d'exécution */}
      <div className="border-t border-gray-200 pt-3 space-y-1">
        <h2 className="text-sm font-medium text-gray-700">Dernier déploiement</h2>
        <p className="text-xs text-gray-500">
          {lastRunLabel} démarré le {formatDate(status?.startedAt ?? null)}
          {status && !status.running && status.exitCode !== null
            ? status.exitCode === 0
              ? ' — terminé avec succès'
              : ` — échec (code ${status.exitCode})`
            : status?.running
              ? ' — en cours'
              : ''}
        </p>
        {connectionLost && (
          <p className="text-xs text-amber-600">
            Serveur momentanément injoignable (redémarrage en cours ?), nouvelle tentative en
            cours...
          </p>
        )}
      </div>

      {/* Journal */}
      {status?.logTail && (
        <div className="border-t border-gray-200 pt-3">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Journal</h2>
          <pre className="text-xs bg-gray-100 text-gray-700 rounded p-3 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">
            {status.logTail}
          </pre>
        </div>
      )}

    </div>
  );
}
