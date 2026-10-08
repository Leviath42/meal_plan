'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { updateUserPassword, updateUserSecurityQuestion } from '@/app/actions/auth';

interface ProfileClientProps {
  session: {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role?: 'ADMIN' | 'MEMBER' | 'GUEST';
      createdAt?: string;
      securityQuestion?: string | null;
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
  const [activeTab, setActiveTab] = useState<'password' | 'security-question'>('password');
  // Anti-remplissage automatique (C-027, renfort) : les champs question/réponse
  // sont en lecture seule au chargement et deviennent éditables au premier
  // focus. Les navigateurs ne remplissent pas les champs readonly, et le
  // token autoComplete="new-password" interdit le remplissage des
  // identifiants sauvegardés même une fois éditable.
  const [securityFieldsEditable, setSecurityFieldsEditable] = useState(false);

  // Rediriger si pas de session — dans un effet, un push pendant le rendu
  // est un anti-pattern React
  useEffect(() => {
    if (!session?.user) {
      router.push('/login');
    }
  }, [session, router]);

  if (!session?.user) {
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

    if (newPassword.length < 10) {
      setFormState({ errors: { newPassword: ['Le mot de passe doit faire au moins 10 caractères'] } });
      setPending(false);
      return;
    }

    formData.append('userId', session.user.id);
    
    const result = await updateUserPassword(null, formData);
    
    if (result?.success) {
      setFormState({ success: true, message: result.message || 'Mot de passe mis à jour avec succès. Veuillez vous reconnecter.' });
      // Purger le cache du service worker : pages authentifiées en Cache Storage
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('meal-plan')).map((key) => caches.delete(key)));
      }
      signOut({ callbackUrl: '/login' });
    } else {
      setFormState(result);
    }
    
    setPending(false);
  };

  const handleSecurityQuestionUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setFormState(null);

    const formData = new FormData(e.currentTarget);
    const securityQuestion = formData.get('securityQuestion') as string;
    const securityAnswer = formData.get('securityAnswer') as string;
    const confirmSecurityAnswer = formData.get('confirmSecurityAnswer') as string;

    // Validation basique côté client
    if (securityAnswer !== confirmSecurityAnswer) {
      setFormState({ errors: { confirmSecurityAnswer: ['Les réponses ne correspondent pas'] } });
      setPending(false);
      return;
    }

    if (securityAnswer.length < 3) {
      setFormState({ errors: { securityAnswer: ['La réponse doit faire au moins 3 caractères'] } });
      setPending(false);
      return;
    }

    formData.append('userId', session.user.id);
    
    const result = await updateUserSecurityQuestion(null, formData);
    
    if (result?.success) {
      setFormState({ success: true, message: result.message || 'Question secrète mise à jour avec succès.' });
      // Recharger pour voir la question secrète mise à jour
      router.refresh();
    } else {
      setFormState(result);
    }
    
    setPending(false);
  };

  return (
    <main className="px-3 sm:px-6 py-2 sm:py-3">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Mon profil</h1>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            session.user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
            session.user.role === 'MEMBER' ? 'bg-green-100 text-green-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {session.user.role}
          </span>
        </div>

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
        <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Nom</p>
              <p className="text-xs sm:text-sm text-gray-900">{session.user.name || 'Non spécifié'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Email</p>
              <p className="text-xs sm:text-sm text-gray-900">{session.user.email}</p>
            </div>
          </div>
          {session.user.role === 'GUEST' && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">Votre compte est en attente de validation par un administrateur.</p>
            </div>
          )}
        </div>

        {/* Onglets pour changer mot de passe ou question secrète */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-2">
          <div className="flex border-b border-gray-200 mb-3">
            <button
              onClick={() => setActiveTab('password')}
              className={`px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'password' 
                  ? 'border-b-2 border-accent text-accent' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Changer le mot de passe
            </button>
            <button
              onClick={() => setActiveTab('security-question')}
              className={`px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'security-question' 
                  ? 'border-b-2 border-accent text-accent' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Question secrète
            </button>
          </div>

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Mot de passe actuel *</label>
                <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" placeholder="Votre mot de passe actuel" required className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {formState?.errors?.currentPassword && <p className="text-red-500 text-xs mt-1">{formState.errors.currentPassword[0]}</p>}
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe *</label>
                <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" placeholder="Minimum 10 caractères" minLength={10} required className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {formState?.errors?.newPassword && <p className="text-red-500 text-xs mt-1">{formState.errors.newPassword[0]}</p>}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe *</label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Confirmez votre nouveau mot de passe" required className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {formState?.errors?.confirmPassword && <p className="text-red-500 text-xs mt-1">{formState.errors.confirmPassword[0]}</p>}
              </div>
              <button type="submit" disabled={pending} className="w-full bg-accent text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50">
                {pending ? 'Mise à jour en cours...' : 'Changer le mot de passe'}
              </button>
            </form>
          )}

          {activeTab === 'security-question' && (
            <form
                  autoComplete="off" onSubmit={handleSecurityQuestionUpdate} className="space-y-4">
              <div className="mb-4 p-3 bg-accent-soft border border-accent-soft rounded">
                <p className="text-xs text-accent">
                  {session.user.securityQuestion ? (
                    <>
                      Question actuelle : <span className="font-medium">{session.user.securityQuestion}</span>. Modifiez-la ci-dessous si besoin.
                    </>
                  ) : (
                    'Configurez une question secrète qui vous permettra de réinitialiser votre mot de passe si vous l\'oubliez.'
                  )}
                </p>
              </div>
              <div>
                <label htmlFor="securityQuestion" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Question secrète *</label>
                <input 
                  id="securityQuestion" 
                  name="securityQuestion" 
                  type="text" 
                  placeholder="Ex: Quel était le nom de votre premier animal de compagnie ?"
                  autoComplete="new-password"
                  readOnly={!securityFieldsEditable}
                  onFocus={() => setSecurityFieldsEditable(true)}
                  required 
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {formState?.errors?.securityQuestion && <p className="text-red-500 text-xs mt-1">{formState.errors.securityQuestion[0]}</p>}
              </div>
              <div>
                <label htmlFor="securityAnswer" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Réponse secrète *</label>
                {
                    /* Champ TEXTE volontairement (pas type=password) : un champ
                       password dans ce formulaire ferait que le gestionnaire de
                       mots de passe remplit/sauvegarde la réponse comme un
                       identifiant de connexion. Sans champ password, le
                       formulaire est totalement ignoré. */
                  }
                <input 
                  id="securityAnswer" 
                  name="securityAnswer" 
                  type="text" 
                  placeholder="Votre réponse"
                  autoComplete="new-password"
                  readOnly={!securityFieldsEditable}
                  onFocus={() => setSecurityFieldsEditable(true)}
                  required 
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {formState?.errors?.securityAnswer && <p className="text-red-500 text-xs mt-1">{formState.errors.securityAnswer[0]}</p>}
              </div>
              <div>
                <label htmlFor="confirmSecurityAnswer" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Confirmer la réponse secrète *</label>
                <input 
                  id="confirmSecurityAnswer" 
                  name="confirmSecurityAnswer" 
                  type="text" 
                  placeholder="Confirmez votre réponse"
                  autoComplete="new-password"
                  readOnly={!securityFieldsEditable}
                  onFocus={() => setSecurityFieldsEditable(true)}
                  required 
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {formState?.errors?.confirmSecurityAnswer && <p className="text-red-500 text-xs mt-1">{formState.errors.confirmSecurityAnswer[0]}</p>}
              </div>
              <button type="submit" disabled={pending} className="w-full bg-accent text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50">
                {pending ? 'Mise à jour en cours...' : 'Configurer la question secrète'}
              </button>
            </form>
          )}
          
          <p className="mt-3 text-xs text-gray-500">
            {activeTab === 'password' 
              ? '* Pour des raisons de sécurité, vous devrez vous reconnecter après avoir changé votre mot de passe.'
              : '* Mémorisez bien votre question et réponse secrète, elles seront nécessaires pour réinitialiser votre mot de passe.'
            }
          </p>
        </div>

        <div className="mt-1">
          <Link href="/" className="text-xs sm:text-sm text-accent hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    </main>
  );
}
