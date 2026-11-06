import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { FEEDBACK_CATEGORY_LABELS } from '@/lib/validators/feedback';
import FeedbackForm from './FeedbackForm';

export const metadata: Metadata = { title: 'Retours — Meal Plan' };

// F15 — Formulaire de retour : page en session uniquement (GUEST ne peut pas
// envoyer de retour, l'action revalide le rôle de toute façon).
export default async function FeedbackPage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/feedback');

  const categoryOptions = Object.entries(FEEDBACK_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold mb-3">Retours</h1>
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
      </div>
    </main>
  );
}
