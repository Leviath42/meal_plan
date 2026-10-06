'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requestPasswordReset } from '@/app/actions/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
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
    const result = await requestPasswordReset(null, formData);

    setFormState(result);
    setPending(false);

    if (result?.success) {
      // Ne pas reset le formulaire pour permettre à l'utilisateur de voir le message
      // et éventuellement demander un nouveau token
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-3 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          <h1 className="text-lg sm:text-xl font-bold text-center text-gray-800 mb-4">
            Mot de passe oublié ?
          </h1>

          <p className="text-xs sm:text-sm text-gray-600 text-center mb-6">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
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
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="ton@email.com"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formState?.errors?.email && (
                <p className="text-red-500 text-xs mt-1">{formState.errors.email[0]}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-blue-600 text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {pending ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs sm:text-sm text-gray-600">
            <Link href="/login" className="text-blue-600 hover:underline">
              Retour à la connexion
            </Link>
          </div>

          {/* Note pour le développement */}
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <p className="font-medium mb-1">⚠️ Mode développement</p>
            <p>En mode dev, le token de réinitialisation est affiché dans la console du serveur.</p>
            <p>Copiez le token et utilisez le lien : <code className="bg-yellow-100 px-1 rounded">/reset-password?token=VOTRE_TOKEN</code></p>
          </div>
        </div>
      </div>
    </main>
  );
}
