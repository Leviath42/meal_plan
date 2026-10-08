'use client';

// app/deploy/DeployClient.tsx
// Pilotage du déploiement beta depuis l'application : version chargée,
// mise à jour (update.sh) et retour arrière (update.sh rollback).
// Le statut est rafraîchi par polling — pendant la mise à jour, le serveur
// redémarre : les requêtes échouent temporairement, on continue de poller.

import { useCallback, useEffect, useState } from 'react';
import {
  getDeployStatus,
  triggerDeploy,
  type DeployStatus,
} from '@/app/actions/deploy';

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

  useEffect(() => {
    poll();
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [poll]);

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
      <h1 className="text-lg font-bold text-gray-800">Déploiement (beta)</h1>

      {/* Version chargée */}
      <div className="space-y-1">
        <div className="text-sm text-gray-600">
          Commit :{' '}
          <span className="font-mono font-medium text-gray-800">
            {status?.currentCommit ?? 'inconnu'}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          Build : <span className="font-mono text-gray-800">{status?.buildId ?? 'inconnu'}</span>
        </div>
      </div>

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
                  ? "Mettre à jour l'application depuis la branche beta de GitHub ? Une sauvegarde de la base est faite avant, le serveur redémarre pendant l'opération."
                  : "Restaurer la dernière sauvegarde de la base ? Les données créées depuis cette sauvegarde seront perdues."}
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
    </div>
  );
}
