'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface WaitingValidationClientProps {
  session: {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: 'ADMIN' | 'MEMBER' | 'GUEST';
      createdAt?: string;
    };
  } | null;
}

export default function WaitingValidationClient({ session }: WaitingValidationClientProps) {
  const router = useRouter();

  useEffect(() => {
    if (!session?.user || session.user.role !== 'GUEST') {
      router.push('/');
    }
  }, [session, router]);

  if (!session?.user || session.user.role !== 'GUEST') {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-3 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Compte en attente de validation</h1>
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
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full bg-gray-200 text-gray-800 rounded py-2 text-xs sm:text-sm font-medium hover:bg-gray-300 transition-colors">
              Se déconnecter
            </button>
            {session.user.createdAt && (
              <p className="text-xs text-gray-500">Créé le : {new Date(session.user.createdAt).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
