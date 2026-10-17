import { Inter } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { getPublicAppSettings } from '@/app/actions/settings';
import { getTheme, themeCssVariables } from '@/lib/themes';
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
    icon: '/icons/icon-192.png?v=3',
    apple: '/icons/icon-192.png?v=3',
  },
  appleWebApp: {
    capable: true,
    title: 'Meal Plan',
    statusBarStyle: 'default',
  },
};

// Viewport : le themeColor n'est PAS géré ici mais par les balises <meta>
// rendues dans RootLayout — la barre d'application mobile doit suivre la
// palette choisie (F14) ET le mode clair/sombre du COOKIE (pas celui du
// système) : generateViewport ne voit pas le cookie de façon fiable et
// met en cache, ce qui laissait la barre figée en teal d'origine (C-041).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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

  // Palette de couleurs (F14) : les variables d'accent du thème choisi
  // surchargent les défauts teal de globals.css — servies dans le HTML
  // initial, aucun flash. Le clair ET le sombre sont injectés : la bascule
  // de mode change de bloc sans recharger.
  let themeStyle = '';
  let themeAccent = '#0f766e';
  let themeAccentDark = '#134e4a';
  try {
    const settings = await getPublicAppSettings();
    const theme = getTheme(settings.theme);
    themeAccent = theme.palette.accentLight;
    themeAccentDark = theme.palette.accentSoftDark;
    themeStyle = `
:root{${themeCssVariables(theme, false)}}
:root.dark{${themeCssVariables(theme, true)}}`;
  } catch {
    // getAppSettings exige une session ; page publique/login : défauts teal
  }

  return (
    // suppressHydrationWarning : pour les visiteurs sans cookie, le script
    // pose .dark après le rendu serveur (préférence système) — différence
    // tolérée sur cet élément unique.
    <html lang="fr" className={themeClass} suppressHydrationWarning>
      {themeStyle && <style dangerouslySetInnerHTML={{ __html: themeStyle }} />}
      {/* Barre d'application mobile (bandes PWA) : la couleur suit la palette
          ET le mode du cookie — la bascule clair/sombre la met à jour côté
          client (ThemeToggle) via l'id, sans recharger */}
      <meta name="theme-color" id="theme-color-meta" content={themeClass === 'dark' ? themeAccentDark : themeAccent} data-light={themeAccent} data-dark={themeAccentDark} />
      <meta name="theme-color" id="theme-color-meta-dark" content={themeAccentDark} media="(prefers-color-scheme: dark)" />
      <body className={inter.className + ' h-full bg-gray-50 text-xs sm:text-sm'}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Nav session={session} />
        <div>{children}</div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
