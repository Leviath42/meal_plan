import { auth } from '@/lib/auth';
import { getNotificationsState } from '@/app/actions/notifications';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const session = await auth();
  
  // Si pas de session, rediriger vers login
  if (!session?.user) {
    // Note: Dans Next.js, on ne peut pas rediriger directement dans un Server Component
    // La page client gérera la redirection
    return <ProfileClient session={null} />;
  }
  
  // F10 — état des notifications pour la section dédiée
  const notifications = session.user.id
    ? await getNotificationsState(session.user.id)
    : null;
  
  return <ProfileClient session={session} notifications={notifications} />;
}
