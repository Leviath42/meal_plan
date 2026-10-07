import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listAccessTokens } from '@/app/actions/tokens';
import ShareClient from './ShareClient';

export default async function SharePage() {
  // Récupère la session côté serveur : seuls les ADMIN voient cette page
  const session = await auth();

  if (session?.user?.role !== 'ADMIN') {
    redirect('/');
  }

  const { tokens = [] } = await listAccessTokens();

  return <ShareClient tokens={tokens} />;
}
