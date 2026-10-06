'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '@/app/actions/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [formState, setFormState] = useState<{
    errors?: Record<string, string[]>;
    success?: boolean;
    message?: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setFormState(null);

    const formData = new FormData(e.currentTarget);
    
    // Ajouter le token au formData
    if (token) {
      formData.append('token', token);
    }

    const result = await resetPassword(null, formData);

    setFormState(result);
    setPending(false);

    if (result?.success) {
      // Rediriger vers la page de connexion après un court délai
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  };

  // Si pas de token, afficher un message d'erreur
  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-3 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
              Lien de réinitialisation invalide
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mb-6">
              Le lien que vous avez utilisé n'est pas valide ou a expiré.
            </p>
            <div className="space-y-3">
              <Link
                href="/forgot-password"
                className="block w-full bg-blue-600 text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Demander un nouveau lien
              </Link>
              <Link
                href="/login"
                className="block text-xs sm:text-sm text-blue-600 hover:underline"
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-3 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          <h1 className="text-lg sm:text-xl font-bold text-center text-gray-800 mb-4">
            Réinitialiser le mot de passe
          </h1>

          <p className="text-xs sm:text-sm text-gray-600 text-center mb-6">
            Entrez votre nouveau mot de passe.
          </p>

          {formState?.message && (
            <div className={`mb-4 px-3 py-2 rounded text-xs sm:text-sm ${formState.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {formState.message}
            </div>
          )}

          {formState?.errors?.form && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs sm:text-sm">
              {formState.errors.form[0]}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe *
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="Minimum 6 caractères"
                minLength={6}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formState?.errors?.newPassword && (
                <p className="text-red-500 text-xs mt-1">{formState.errors.newPassword[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Confirmer le nouveau mot de passe *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirmez votre nouveau mot de passe"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formState?.errors?.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{formState.errors.confirmPassword[0]}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-blue-600 text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {pending ? 'Réinitialisation en cours...' : 'Réinitialiser le mot de passe'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs sm:text-sm text-gray-600">
            <Link href="/login" className="text-blue-600 hover:underline">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
