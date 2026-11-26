import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUSES,
  type FeedbackCategory,
  type FeedbackStatus,
} from '@/lib/validators/feedback';
import FeedbackForm from './FeedbackForm';
import FeedbackAdmin from './FeedbackAdmin';

export const metadata: Metadata = { title: 'Suggestions et bugs — Meal Plan' };

// F15 — Formulaire de retour : page en session uniquement (GUEST ne peut pas
// envoyer de retour, l'action revalide le rôle de toute façon). Pour l'ADMIN,
// la section de tri des retours du foyer est intégrée sous le formulaire
// (ex-/admin/feedback) — une seule page, un seul badge dans la nav.
export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/feedback');

  const params = await searchParams;
  const filterCategory = FEEDBACK_CATEGORIES.includes(params.category as FeedbackCategory)
    ? (params.category as FeedbackCategory)
    : null;
  const filterStatus = FEEDBACK_STATUSES.includes(params.status as FeedbackStatus)
    ? (params.status as FeedbackStatus)
    : null;

  const isAdmin = session.user.role === 'ADMIN';

  const categoryOptions = Object.entries(FEEDBACK_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold mb-3">Suggestions et bugs</h1>
        {session.user.role === 'GUEST' ? (
          <p className="text-xs sm:text-sm text-gray-600">
            Votre compte est en attente de validation : un administrateur doit d’abord valider votre
            accès avant que vous puissiez envoyer un retour.
          </p>
        ) : (
          <>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Un bug, une idée, une question sur l’abonnement ? Dites-nous tout — le message part
              directement à l’équipe, avec la page d’où vous écrivez.
            </p>
            <FeedbackForm categoryOptions={categoryOptions} />
          </>
        )}
        {isAdmin && <FeedbackAdmin filterCategory={filterCategory} filterStatus={filterStatus} />}
      </div>
    </main>
  );
}
