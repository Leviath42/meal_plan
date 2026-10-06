import { auth } from '@/lib/auth';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const session = await auth();
  
  // Si pas de session, rediriger vers login
  if (!session?.user) {
    // Note: Dans Next.js, on ne peut pas rediriger directement dans un Server Component
    // La page client gérera la redirection
    return <ProfileClient session={null} />;
  }
  
  return <ProfileClient session={session} />;
}
