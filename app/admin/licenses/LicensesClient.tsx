'use client';

import { useState } from 'react';
import { suspendLicenseAction, reactivateLicenseAction } from '@/app/actions/license';

type LicenseRow = {
  id: string;
  status: string;
  cgvVersion: string | null;
  licensedAt: string | null;
  stripeSessionId: string | null;
  stripeCustomerId: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  reactivatedAt: string | null;
  createdAt: string;
};

type AuditRow = {
  id: string;
  licenseId: string;
  action: string;
  reason: string | null;
  at: string;
};

export default function LicensesClient({ licenses, audit }: { licenses: LicenseRow[]; audit: AuditRow[] }) {
  const [reason, setReason] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const statusBadge = (s: string) =>
    s === 'active'
      ? 'bg-green-100 text-green-800'
      : s === 'suspended'
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-200 text-gray-700';

  return (
    <div className="space-y-6">
      {message && <p className="text-sm px-3 py-2 rounded bg-green-50 border border-green-200 text-green-700">{message}</p>}

      <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-3">
        <h2 className="font-semibold mb-2 text-sm">Licences ({licenses.length})</h2>
        {licenses.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune licence pour le moment (essai en cours).</p>
        ) : (
          <ul className="space-y-2 text-xs sm:text-sm">
            {licenses.map((l) => (
              <li key={l.id} className="border border-gray-200 dark:border-gray-700 rounded p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-medium ${statusBadge(l.status)}`}>{l.status}</span>
                  <span className="font-mono text-xs">…{l.stripeSessionId?.slice(-8) ?? l.id.slice(0, 8)}</span>
                  {l.cgvVersion && <span className="text-gray-500">CGV {l.cgvVersion}</span>}
                  {l.licensedAt && <span className="text-gray-500">le {l.licensedAt.slice(0, 10)}</span>}
                </div>
                {l.suspensionReason && <p className="text-red-600 mt-1">Raison : {l.suspensionReason}</p>}
                <div className="flex gap-2 mt-2">
                  {l.status === 'active' && (
                    <button
                      onClick={() => { setTargetId(l.id); setReason(''); }}
                      className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Suspendre…
                    </button>
                  )}
                  {l.status === 'suspended' && (
                    <button
                      onClick={async () => {
                        const r = await reactivateLicenseAction(l.id);
                        setMessage(r.message ?? null);
                      }}
                      className="text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50"
                    >
                      Réactiver
                    </button>
                  )}
                </div>
                {targetId === l.id && (
                  <form
                    className="flex gap-2 mt-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const r = await suspendLicenseAction(l.id, reason);
                      setMessage(r.message ?? null);
                      setTargetId(null);
                    }}
                  >
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Raison (tracée)"
                      className="flex-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
                    />
                    <button type="submit" className="text-xs px-2 py-1 rounded bg-red-600 text-white">Confirmer</button>
                    <button type="button" onClick={() => setTargetId(null)} className="text-xs px-2 py-1 rounded border">Annuler</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-3">
        <h2 className="font-semibold mb-2 text-sm">Journal d’audit</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune action tracée.</p>
        ) : (
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {audit.slice(0, 50).map((a) => (
              <li key={a.id}>
                {a.at.slice(0, 16).replace('T', ' ')} — <strong>{a.action}</strong> {a.reason ? `(${a.reason})` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
