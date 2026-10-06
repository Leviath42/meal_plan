'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function WaitingValidationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Si la session est chargée mais il n'y a pas d'utilisateur ou l'utilisateur n'est pas GUEST, rediriger
    if (status !== 'loading') {
      if (!session?.user || session.user.role !== 'GUEST') {
        router.push('/');
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center p-3 bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Chargement...</p>
        </div>
      </main>
    );
  }

  if (!session?.user || session.user.role !== 'GUEST') {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-3 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
            Compte en attente de validation
          </h1>
          
          <div className="mb-6">
            <svg className="mx-auto mb-4 h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            
            <p className="text-xs sm:text-sm text-gray-600 mb-2">
              Votre compte <span className="font-medium">{session.user.email}</span> a bien été créé.
            </p>
            
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Un administrateur doit valider votre inscription avant que vous puissiez accéder à l'application.
            </p>
            
            <p className="text-xs text-gray-500 mb-6">
              Vous recevrez une notification une fois votre compte activé.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full bg-gray-200 text-gray-800 rounded py-2 text-xs sm:text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Se déconnecter
            </button>
            
            <p className="text-xs text-gray-500">
              Créé le : {new Date(session.user.createdAt || '').toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
