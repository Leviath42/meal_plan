import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { feedback, users } from '@/lib/db/schema';
import { changeFeedbackStatus } from '@/app/actions/feedback';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  type FeedbackCategory,
  type FeedbackStatus,
} from '@/lib/validators/feedback';

export const metadata: Metadata = { title: 'Retours clients — Meal Plan' };

// F15 — Tri des retours côté ADMIN : liste, filtres catégorie/statut,
// changement de statut (un bouton par statut, formulaires serveur) et compteurs.
export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string }>;
}) {
  const session = await auth();
  // Non-admin (y compris GUEST et non connecté) : refus (F4)
  if (session?.user?.role !== 'ADMIN') redirect('/');

  const params = await searchParams;
  const filterCategory = FEEDBACK_CATEGORIES.includes(params.category as FeedbackCategory)
    ? (params.category as FeedbackCategory)
    : null;
  const filterStatus = FEEDBACK_STATUSES.includes(params.status as FeedbackStatus)
    ? (params.status as FeedbackStatus)
    : null;

  // Instance familiale : volume faible, on charge tout et on filtre en mémoire
  // — les compteurs restent ainsi cohérents avec les filtres affichés.
  const rows = await db
    .select({
      id: feedback.id,
      category: feedback.category,
      message: feedback.message,
      pageUrl: feedback.pageUrl,
      appVersion: feedback.appVersion,
      status: feedback.status,
      createdAt: feedback.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.userId, users.id))
    .orderBy(desc(feedback.createdAt));

  const visible = rows.filter(
    (r) =>
      (!filterCategory || r.category === filterCategory) &&
      (!filterStatus || r.status === filterStatus)
  );

  const countBy = (get: (r: (typeof rows)[number]) => string) => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(get(r), (counts.get(get(r)) ?? 0) + 1);
    return counts;
  };
  const categoryCounts = countBy((r) => r.category);
  const statusCounts = countBy((r) => r.status);

  // Lien de filtre : conserve l'autre filtre actif, retire le filtre si déjà actif
  const href = (key: 'category' | 'status', value: string | null) => {
    const q = new URLSearchParams();
    const cat = key === 'category' ? value : filterCategory;
    const st = key === 'status' ? value : filterStatus;
    if (cat) q.set('category', cat);
    if (st) q.set('status', st);
    const qs = q.toString();
    return `/admin/feedback${qs ? `?${qs}` : ''}`;
  };

  const pill = (active: boolean) =>
    `inline-block rounded-full border px-3 py-1 text-xs transition-colors ${
      active
        ? 'border-accent bg-accent-soft font-medium'
        : 'border-gray-300 hover:border-gray-400'
    }`;

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="text-lg sm:text-xl font-bold">Retours clients</h1>

        {/* Compteurs */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <span className="font-medium text-gray-900">{rows.length} au total</span>
          {FEEDBACK_CATEGORIES.map((c) => (
            <span key={c} className="rounded-full bg-gray-100 px-2 py-0.5">
              {FEEDBACK_CATEGORY_LABELS[c]} : {categoryCounts.get(c) ?? 0}
            </span>
          ))}
          {FEEDBACK_STATUSES.map((s) => (
            <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5">
              {FEEDBACK_STATUS_LABELS[s]} : {statusCounts.get(s) ?? 0}
            </span>
          ))}
        </div>

        {/* Filtres */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <a href={href('category', null)} className={pill(!filterCategory)}>Toutes catégories</a>
            {FEEDBACK_CATEGORIES.map((c) => (
              <a key={c} href={href('category', c)} className={pill(filterCategory === c)}>
                {FEEDBACK_CATEGORY_LABELS[c]}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={href('status', null)} className={pill(!filterStatus)}>Tous statuts</a>
            {FEEDBACK_STATUSES.map((s) => (
              <a key={s} href={href('status', s)} className={pill(filterStatus === s)}>
                {FEEDBACK_STATUS_LABELS[s]}
              </a>
            ))}
          </div>
        </div>

        {/* Liste */}
        {visible.length === 0 ? (
          <p className="text-xs sm:text-sm text-gray-600">
            Aucun retour {filterCategory || filterStatus ? 'pour ces filtres' : 'pour le moment'}.
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((r) => (
              <li key={r.id} className="rounded border border-gray-300 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium">
                    {FEEDBACK_CATEGORY_LABELS[r.category]}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">
                    {FEEDBACK_STATUS_LABELS[r.status]}
                  </span>
                  <span className="text-gray-500">
                    {r.userName || r.userEmail} · {r.createdAt}
                    {r.appVersion ? ` · v${r.appVersion}` : ''}
                  </span>
                </div>
                <p className="text-xs sm:text-sm whitespace-pre-wrap">{r.message}</p>
                {r.pageUrl && (
                  <p className="text-xs text-gray-500">Page : {r.pageUrl}</p>
                )}
                {/* Changement de statut : un bouton par statut, le statut courant est neutralisé */}
                <form action={changeFeedbackStatus} className="flex flex-wrap gap-1">
                  <input type="hidden" name="id" value={r.id} />
                  {FEEDBACK_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="submit"
                      name="status"
                      value={s}
                      disabled={r.status === s}
                      className={`rounded border px-2 py-1 text-xs transition-colors ${
                        r.status === s
                          ? 'border-accent bg-accent-soft font-medium text-gray-500'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {FEEDBACK_STATUS_LABELS[s]}
                    </button>
                  ))}
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
