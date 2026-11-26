import { desc, eq } from 'drizzle-orm';
import { getCurrentHouseholdId } from '@/lib/auth-guards';
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

// F15 — Section admin des retours, intégrée à la page /feedback (l'admin
// tri au même endroit que le formulaire, plus de page /admin/feedback dédiée).
export default async function FeedbackAdmin({
  filterCategory,
  filterStatus,
}: {
  filterCategory: FeedbackCategory | null;
  filterStatus: FeedbackStatus | null;
}) {
  // F17 (C-062) : l'admin ne trie que les retours DE SON foyer
  const householdId = await getCurrentHouseholdId();

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
    .where(eq(feedback.householdId, householdId))
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
    return `/feedback${qs ? `?${qs}` : ''}`;
  };

  const pill = (active: boolean) =>
    `inline-block rounded-full border px-3 py-1 text-xs transition-colors ${
      active
        ? 'border-accent bg-accent-soft font-medium'
        : 'border-gray-300 hover:border-gray-400'
    }`;

  return (
    <section aria-label='Retours des membres du foyer' className='space-y-5 pt-6 mt-6 border-t border-gray-200'>
      <h2 className='text-lg sm:text-xl font-bold'>Retours du foyer</h2>

      {/* Compteurs */}
      <div className='flex flex-wrap items-center gap-2 text-xs text-gray-600'>
        <span className='font-medium text-gray-900'>{rows.length} au total</span>
        {FEEDBACK_CATEGORIES.map((c) => (
          <span key={c} className='rounded-full bg-gray-100 px-2 py-0.5'>
            {FEEDBACK_CATEGORY_LABELS[c]} : {categoryCounts.get(c) ?? 0}
          </span>
        ))}
        {FEEDBACK_STATUSES.map((s) => (
          <span key={s} className='rounded-full bg-gray-100 px-2 py-0.5'>
            {FEEDBACK_STATUS_LABELS[s]} : {statusCounts.get(s) ?? 0}
          </span>
        ))}
      </div>

      {/* Filtres */}
      <div className='space-y-2'>
        <div className='flex flex-wrap gap-2'>
          <a href={href('category', null)} className={pill(!filterCategory)}>Toutes catégories</a>
          {FEEDBACK_CATEGORIES.map((c) => (
            <a key={c} href={href('category', c)} className={pill(filterCategory === c)}>
              {FEEDBACK_CATEGORY_LABELS[c]}
            </a>
          ))}
        </div>
        <div className='flex flex-wrap gap-2'>
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
        <p className='text-xs sm:text-sm text-gray-600'>
          Aucun retour {filterCategory || filterStatus ? 'pour ces filtres' : 'pour le moment'}.
        </p>
      ) : (
        <ul className='space-y-3'>
          {visible.map((r) => (
            <li key={r.id} className='rounded border border-gray-300 p-3 space-y-2'>
              <div className='flex flex-wrap items-center gap-2 text-xs'>
                <span className='rounded-full bg-gray-100 px-2 py-0.5 font-medium'>
                  {FEEDBACK_CATEGORY_LABELS[r.category]}
                </span>
                <span className='rounded-full bg-gray-100 px-2 py-0.5'>
                  {FEEDBACK_STATUS_LABELS[r.status]}
                </span>
                <span className='text-gray-500'>
                  {r.userName || r.userEmail} · {r.createdAt}
                  {r.appVersion ? ` · v${r.appVersion}` : ''}
                </span>
              </div>
              <p className='text-xs sm:text-sm whitespace-pre-wrap'>{r.message}</p>
              {r.pageUrl && (
                <p className='text-xs text-gray-500'>Page : {r.pageUrl}</p>
              )}
              {/* Changement de statut : un bouton par statut, le statut courant est neutralisé */}
              <form action={changeFeedbackStatus} className='flex flex-wrap gap-1'>
                <input type='hidden' name='id' value={r.id} />
                {FEEDBACK_STATUSES.map((s) => (
                  <button
                    key={s}
                    type='submit'
                    name='status'
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
    </section>
  );
}
