import { getUserSecurityQuestion, resetPasswordWithSecurityQuestion } from '@/app/actions/auth';
import ResetPasswordClient from './ResetPasswordClient';

interface ResetPasswordPageProps {
  searchParams: {
    email?: string;
    step?: string;
  };
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  // searchParams est une Promise dans Next.js 16, il faut l'attendre
  const resolvedSearchParams = await searchParams;
  const email = resolvedSearchParams.email as string | undefined;
  const step = resolvedSearchParams.step as string | undefined;

  // Si on a un email et qu'on est à l'étape 1, récupérer la question secrète
  let securityQuestion: string | null = null;
  let hasSecurityQuestion = false;

  if (email && (!step || step === '1')) {
    const questionData = await getUserSecurityQuestion(email);
    if (questionData.securityQuestion) {
      securityQuestion = questionData.securityQuestion;
      hasSecurityQuestion = true;
    }
  }

  return (
    <ResetPasswordClient
      email={email}
      step={step}
      securityQuestion={securityQuestion}
      hasSecurityQuestion={hasSecurityQuestion}
    />
  );
}
