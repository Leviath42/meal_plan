import { Inter } from 'next/font/google';
import { auth } from '@/lib/auth';
import { SessionProvider } from 'next-auth/react';
import Nav from './Nav';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Meal Plan App',
  description: 'Application de planification des repas familiale',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Applique le thème avant le premier rendu pour éviter un flash de mode clair :
// préférence enregistrée, sinon préférence système
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    // suppressHydrationWarning : le script ci-dessous ajoute la classe .dark
    // sur <html> avant l'hydratation React.
    // PAS de className dans ce JSX : React ne doit pas gérer l'attribut class
    // de <html>, sinon un re-rendu client complet (erreur d'hydratation sur
    // n'importe quelle page) écraserait la classe .dark → bascule en clair.
    // La hauteur (ex-utilitaire h-full) vit dans styles/globals.css.
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className + ' h-full bg-gray-50 text-xs sm:text-sm'}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <SessionProvider session={session}>
          <Nav session={session} />
          <div>{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
