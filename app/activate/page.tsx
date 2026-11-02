import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ActivateForm } from './ActivateForm';
import { getPublicLicenseStatus } from '@/app/actions/license';

export default async function ActivatePage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/activate');

  const status = await getPublicLicenseStatus();
  const paymentLink = process.env.STRIPE_PAYMENT_LINK ?? '';

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-lg sm:text-xl font-bold">Activer votre licence</h1>

        {status.kind === 'trial' && (
          <p className="text-sm px-3 py-2 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            Essai en cours : encore {status.daysLeft} jour{status.daysLeft > 1 ? 's' : ''}.
          </p>
        )}
        {status.kind === 'expired' && (
          <p className="text-sm px-3 py-2 rounded bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            Essai terminé — l’application est en lecture seule. Activez votre licence pour continuer à écrire.
          </p>
        )}
        {status.kind === 'suspended' && (
          <p className="text-sm px-3 py-2 rounded bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            Licence suspendue{status.reason ? ` (${status.reason})` : ''}. Vos données sont conservées — contactez le support.
          </p>
        )}

        <ActivateForm />

        {paymentLink && status.kind !== 'active' && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pas encore de licence ?{' '}
            <a href={paymentLink} className="text-accent hover:underline font-medium">
              Acheter la licence à vie (foyer)
            </a>{' '}
            — la clé d’activation arrive par email, à saisir ci-dessus.
          </div>
        )}
      </div>
    </main>
  );
}
