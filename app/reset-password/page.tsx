import { getUserSecurityQuestion, resetPasswordWithSecurityQuestion } from '@/app/actions/auth';
import ResetPasswordClient from './ResetPasswordClient';

interface ResetPasswordPageProps {
  searchParams: {
    email?: string;
  };
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  // searchParams est une Promise dans Next.js 16, il faut l'attendre
  const resolvedSearchParams = await searchParams;
  const email = resolvedSearchParams.email as string | undefined;

  // Si un email est fourni dans l'URL, récupérer directement sa question secrète
  let securityQuestion: string | null = null;

  if (email) {
    const questionData = await getUserSecurityQuestion(email);
    if (questionData.securityQuestion) {
      securityQuestion = questionData.securityQuestion;
    }
  }

  return (
    <ResetPasswordClient
      email={email}
      securityQuestion={securityQuestion}
    />
  );
}
