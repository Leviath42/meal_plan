import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import Nav from './Nav';
import ServiceWorkerRegister from './ServiceWorkerRegister';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Meal Plan',
  description: 'Application de planification des repas familiale',
  applicationName: 'Meal Plan',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Meal Plan',
    statusBarStyle: 'default',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f766e',
};

// Filet de secours pour les visiteurs sans cookie de thème : le serveur ne
// connaît pas la préférence système, ce petit script la déduit avant le
// premier rendu et pose la classe .dark. Il pose AUSSI le cookie pour que
// le chargement suivant soit rendu côté serveur (plus de script nécessaire).
// Avec un cookie, le script ne fait rien : la classe vient du HTML serveur.
const themeInitScript = `(function(){try{if(document.cookie.indexOf('meal-theme=')!==-1)return;var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var v=d?'dark':'light';if(t||d){document.documentElement.classList.toggle('dark',d);document.cookie='meal-theme='+v+';path=/;max-age=31536000;samesite=lax';}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Thème rendu côté serveur depuis le cookie (posé par ThemeToggle ou par le
  // script de migration ci-dessus). La classe .dark est donc dans le HTML
  // initial : pas de flash, et React la re-rend telle quelle lors de
  // n'importe quel re-rendu client — la bascule en mode clair devient
  // impossible, quel que soit le mécanisme qui la provoquait.
  const themeCookie = (await cookies()).get('meal-theme')?.value;
  const themeClass = themeCookie === 'dark' ? 'dark' : undefined;

  return (
    // suppressHydrationWarning : pour les visiteurs sans cookie, le script
    // pose .dark après le rendu serveur (préférence système) — différence
    // tolérée sur cet élément unique.
    <html lang="fr" className={themeClass} suppressHydrationWarning>
      <body className={inter.className + ' h-full bg-gray-50 text-xs sm:text-sm'}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Nav session={session} />
        <div>{children}</div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
