import { auth } from '@/lib/auth';
import WaitingValidationClient from './WaitingValidationClient';

export default async function WaitingValidationPage() {
  const session = await auth();
  
  // Si l'utilisateur n'est pas connecté ou n'est pas GUEST, rediriger
  if (!session?.user || session.user.role !== 'GUEST') {
    // La page client gérera la redirection
    return <WaitingValidationClient session={null} />;
  }
  
  return <WaitingValidationClient session={session} />;
}
