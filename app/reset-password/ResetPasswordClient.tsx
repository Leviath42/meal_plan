'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { resetPasswordWithSecurityQuestion, getUserSecurityQuestion, verifySecurityAnswer } from '@/app/actions/auth';

interface ResetPasswordClientProps {
  email?: string;
  step?: string;
  securityQuestion: string | null;
  hasSecurityQuestion: boolean;
}

export default function ResetPasswordClient({ 
  email: initialEmail, 
  step: initialStep,
  securityQuestion,
  hasSecurityQuestion 
}: ResetPasswordClientProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<{
    errors?: Record<string, string[]>;
    success?: boolean;
    message?: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState(initialEmail || '');
  const [step, setStep] = useState(initialStep || '1');
  const [currentQuestion, setCurrentQuestion] = useState(securityQuestion);
  
  // States pour les champs contrôlés de l'étape 2
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Synchroniser les states locaux avec les props quand elles changent (navigation avec router.push)
  useEffect(() => {
    if (initialEmail !== undefined) {
      setEmail(initialEmail || '');
    }
    if (initialStep !== undefined) {
      setStep(initialStep || '1');
    }
    setCurrentQuestion(securityQuestion);
    // Réinitialiser les champs de l'étape 2 quand on revient à l'étape 1
    if (initialStep === '1') {
      setSecurityAnswer('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [initialEmail, initialStep, securityQuestion]);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setFormState(null);

    const formData = new FormData(e.currentTarget);
    const emailFromForm = formData.get('email') as string;

    if (!emailFromForm) {
      setFormState({ errors: { email: ['Email requis'] } });
      setPending(false);
      return;
    }

    // Récupérer la question secrète pour cet email via navigation
    router.push(`/reset-password?email=${encodeURIComponent(emailFromForm)}&step=1`);
    setPending(false);
  };

  const handleQuestionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setFormState(null);

    if (!securityAnswer) {
      setFormState({ errors: { securityAnswer: ['Réponse requise'] } });
      setPending(false);
      return;
    }

    // Vérifier la réponse côté serveur AVANT de passer à l'étape 2
    const result = await verifySecurityAnswer(email, securityAnswer);

    if (result?.success) {
      setStep('2');
      setFormState({ success: true, message: result.message });
    } else {
      setFormState(result);
    }

    setPending(false);
  };

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setFormState(null);

    // Validation
    if (!securityAnswer) {
      setFormState({ errors: { securityAnswer: ['Réponse requise'] } });
      setPending(false);
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setFormState({ errors: { newPassword: ['Le mot de passe doit faire au moins 6 caractères'] } });
      setPending(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormState({ errors: { confirmPassword: ['Les mots de passe ne correspondent pas'] } });
      setPending(false);
      return;
    }

    // Créer formData manuellement
    const formData = new FormData();
    formData.append('email', email);
    formData.append('securityAnswer', securityAnswer);
    formData.append('newPassword', newPassword);
    formData.append('confirmPassword', confirmPassword);

    const result = await resetPasswordWithSecurityQuestion(null, formData);

    if (result?.success) {
      setFormState({ success: true, message: result.message });
      // Réinitialiser les champs
      setSecurityAnswer('');
      setNewPassword('');
      setConfirmPassword('');
      // Rediriger vers login après 3 secondes
      setTimeout(() => router.push('/login'), 3000);
    } else {
      setFormState(result);
    }

    setPending(false);
  };

  // Étape 1 : Demander l'email
  if (step === '1' && !currentQuestion) {
    return (
      <main className="min-h-screen flex items-center justify-center p-3 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Réinitialiser le mot de passe</h1>
            <p className="text-xs sm:text-sm text-gray-600 mb-6">
              Entrez votre adresse email pour recevoir votre question secrète.
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

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  required
                  autoComplete="username"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.email && <p className="text-red-500 text-xs mt-1">{formState.errors.email[0]}</p>}
              </div>
              
              <button type="submit" disabled={pending} className="w-full bg-blue-600 text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {pending ? 'En cours...' : 'Continuer'}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-gray-500">
              <Link href="/login" className="text-blue-600 hover:underline">Se connecter</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Étape 2 : Répondre à la question secrète et définir un nouveau mot de passe
  if (step === '2' || (step === '1' && currentQuestion)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-3 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Réinitialiser le mot de passe</h1>

            {currentQuestion && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs sm:text-sm font-medium text-blue-800">
                  Question secrète :
                </p>
                <p className="text-xs sm:text-sm text-gray-800 mt-1">
                  {currentQuestion}
                </p>
              </div>
            )}

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

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label htmlFor="securityAnswer" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Réponse à la question secrète *</label>
                <input
                  id="securityAnswer"
                  name="securityAnswer"
                  type="password"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Votre réponse"
                  required
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.securityAnswer && <p className="text-red-500 text-xs mt-1">{formState.errors.securityAnswer[0]}</p>}
              </div>
              
              <div>
                <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe *</label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                  required
                  autoComplete="new-password"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.newPassword && <p className="text-red-500 text-xs mt-1">{formState.errors.newPassword[0]}</p>}
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe *</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez votre nouveau mot de passe"
                  required
                  autoComplete="new-password"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.confirmPassword && <p className="text-red-500 text-xs mt-1">{formState.errors.confirmPassword[0]}</p>}
              </div>
              
              <button type="submit" disabled={pending} className="w-full bg-blue-600 text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {pending ? 'Réinitialisation en cours...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-gray-500">
              <Link href="/login" className="text-blue-600 hover:underline">Se connecter</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Cas par défaut : demander l'email
  return (
    <main className="min-h-screen flex items-center justify-center p-3 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Réinitialiser le mot de passe</h1>
          <p className="text-xs sm:text-sm text-gray-600 mb-6">
            Entrez votre adresse email pour commencer la réinitialisation.
          </p>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                autoComplete="username"
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button type="submit" disabled={pending} className="w-full bg-blue-600 text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {pending ? 'En cours...' : 'Continuer'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-gray-500">
            <Link href="/login" className="text-blue-600 hover:underline">Se connecter</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
