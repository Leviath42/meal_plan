import { Inter } from 'next/font/google';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { signOut } from "next-auth/react";
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Meal Plan App',
  description: 'Application de planification des repas familiale',
};

// Composant de navigation (Client Component)
function Navigation({ session }: { session: any }) {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-blue-600">
            Meal Plan
          </Link>

          <div className="flex gap-6 items-center">
            {session ? (
              <>
                <Link
                  href="/recipes"
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Recettes
                </Link>
                <Link
                  href="/ingredients"
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Ingrédients
                </Link>

                {session.user?.role === "ADMIN" && (
                  <Link
                    href="/register"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Gérer les utilisateurs
                  </Link>
                )}

                <span className="text-gray-400">|</span>

                <span className="text-sm text-gray-600 hidden md:inline">
                  {session.user?.name || session.user?.email}
                  {session.user?.role && (
                    <span className="text-xs bg-gray-100 rounded px-2 py-0.5 ml-2">
                      {session.user.role}
                    </span>
                  )}
                </span>

                <form
                  action={async () => {
                    "use server";
                    const { signOut: serverSignOut } = await import("@/lib/auth");
                    await serverSignOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="text-gray-600 hover:text-red-600 transition-colors"
                  >
                    Déconnexion
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Récupère la session côté serveur
  const session = await auth();

  return (
    <html lang="fr" className="h-full">
      <body className={inter.className + ' h-full bg-gray-50'}>
        <Navigation session={session} />
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
