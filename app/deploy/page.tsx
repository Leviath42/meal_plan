import { auth } from '@/lib/auth';
import DeployClient from './DeployClient';

// Page de déploiement : visible par tout utilisateur connecté (la version
// chargée est une information utile à tous), les actions sont réservées à
// l'ADMIN et revalidées côté serveur.
export default async function DeployPage() {
  const session = await auth();

  return (
    <main className="px-3 sm:px-6 py-2 sm:py-3 max-w-2xl mx-auto">
      <DeployClient role={session?.user?.role ?? null} />
    </main>
  );
}
