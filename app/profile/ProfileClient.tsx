'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { updateUserPassword } from '@/app/actions/auth';

interface ProfileClientProps {
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

export default function ProfileClient({ session }: ProfileClientProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<{
    errors?: Record<string, string[]>;
    success?: boolean;
    message?: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

  // Rediriger si pas de session
  if (!session?.user) {
    router.push('/login');
    return null;
  }

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setFormState(null);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validation basique côté client
    if (newPassword !== confirmPassword) {
      setFormState({ errors: { confirmPassword: ['Les mots de passe ne correspondent pas'] } });
      setPending(false);
      return;
    }

    if (newPassword.length < 6) {
      setFormState({ errors: { newPassword: ['Le mot de passe doit faire au moins 6 caractères'] } });
      setPending(false);
      return;
    }

    formData.append('userId', session.user.id);
    
    const result = await updateUserPassword(null, formData);
    
    if (result?.success) {
      // Capturer la référence du formulaire avant toute opération asynchrone
      const formElement = e.currentTarget;
      setFormState({ success: true, message: result.message || 'Mot de passe mis à jour avec succès. Veuillez vous reconnecter.' });
      // Reset le formulaire avant la déconnexion
      formElement.reset();
      // Ne pas await car signOut déclenche une redirection qui détruit le composant
      signOut({ callbackUrl: '/login' });
    } else {
      setFormState(result);
    }
    
    setPending(false);
  };

  return (
    <main className="min-h-screen px-3 sm:px-6 py-4 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-6">Mon profil</h1>

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

        {/* Informations du profil */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Informations personnelles</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Nom</p>
              <p className="text-xs sm:text-sm text-gray-900">{session.user.name || 'Non spécifié'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Email</p>
              <p className="text-xs sm:text-sm text-gray-900">{session.user.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Rôle</p>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                session.user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                session.user.role === 'MEMBER' ? 'bg-green-100 text-green-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {session.user.role}
              </span>
            </div>
            {session.user.role === 'GUEST' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-800">Votre compte est en attente de validation par un administrateur.</p>
              </div>
            )}
          </div>
        </div>

        {/* Changement de mot de passe */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Changer le mot de passe</h2>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Mot de passe actuel *</label>
              <input id="currentPassword" name="currentPassword" type="password" placeholder="Votre mot de passe actuel" required className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {formState?.errors?.currentPassword && <p className="text-red-500 text-xs mt-1">{formState.errors.currentPassword[0]}</p>}
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe *</label>
              <input id="newPassword" name="newPassword" type="password" placeholder="Minimum 6 caractères" minLength={6} required className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {formState?.errors?.newPassword && <p className="text-red-500 text-xs mt-1">{formState.errors.newPassword[0]}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe *</label>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirmez votre nouveau mot de passe" required className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {formState?.errors?.confirmPassword && <p className="text-red-500 text-xs mt-1">{formState.errors.confirmPassword[0]}</p>}
            </div>
            <button type="submit" disabled={pending} className="w-full bg-blue-600 text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {pending ? 'Mise à jour en cours...' : 'Changer le mot de passe'}
            </button>
          </form>
          <p className="mt-3 text-xs text-gray-500">* Pour des raisons de sécurité, vous devrez vous reconnecter après avoir changé votre mot de passe.</p>
        </div>

        <div className="mt-4">
          <Link href="/" className="text-xs sm:text-sm text-blue-600 hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    </main>
  );
}
