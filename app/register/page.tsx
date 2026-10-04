import { auth } from '@/lib/auth';
import { getAllUsers } from '@/app/actions/auth';
import RegisterClient from './RegisterClient';

export default async function RegisterPage() {
  // Récupère la session côté serveur
  const session = await auth();

  // Si connecté et admin, récupérer tous les utilisateurs
  let users = [];
  if (session?.user?.role === 'ADMIN') {
    users = await getAllUsers();
  }

  // Passer les données au Client Component
  return <RegisterClient 
    session={session} 
    users={users} 
    currentUserId={session?.user?.id}
  />;
}
