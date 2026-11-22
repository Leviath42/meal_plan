'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from "next-auth/react";
import { Session } from "next-auth";
import ThemeToggle from './ThemeToggle';

// Navigation : niveau 1 = usage quotidien (Calendrier, Recettes, Courses,
// Garde-manger). Le reste vit dans « Plus » (Ingrédients, Stats, Retours,
// Paramètres, Licences admin), pour ne plus noyer la barre de 8 liens à plat.

interface NavItem {
  href: string;
  label: string;
}

const MAIN_ITEMS: NavItem[] = [
  { href: '/calendar', label: 'Calendrier' },
  { href: '/recipes', label: 'Recettes' },
  { href: '/shopping-list', label: 'Courses' },
  { href: '/pantry', label: 'Garde-manger' },
];

// newFeedbackCount : retours « nouveau »du foyer de l'admin (rendu serveur du
// layout). Badge visible sur « Plus »et sur l'entrée « Retours »: l'admin
// voit l'alerte sans ouvrir le menu, ni se rendre sur /admin/feedback.
export default function Nav({
  session,
  newFeedbackCount = 0,
}: {
  session: Session | null;
  newFeedbackCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const isAdmin = session?.user?.role === 'ADMIN';

  // Éléments secondaires : visibles de tous ; Licences réservée admin
  const moreItems: NavItem[] = [
    { href: '/ingredients', label: 'Ingrédients' },
    { href: '/stats', label: 'Stats' },
    { href: '/feedback', label: 'Retours' },
    { href: '/settings', label: 'Paramètres' },
    ...(isAdmin ? [{ href: '/admin/licenses', label: 'Licences' }] : []),
  ];

  // Touche Échap ET clic hors du menu « Plus » : fermer ce qui est ouvert
  useEffect(() => {
    if (!isMobileMenuOpen && !isMoreOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsMoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, isMoreOpen]);

  useEffect(() => {
    if (!isMoreOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreOpen]);

  // Fermer le menu « Plus » quand on navigue
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    // Vider le cache du service worker : il contient des pages rendues avec
    // les données familiales (planning, recettes) — un appareil partagé ne
    // doit pas les garder après une déconnexion.
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('meal-plan')).map((key) => caches.delete(key)));
    }
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

  // Badge pastille du compteur (F15) : 9+ si le count dépasse, min-w pour éviter
  // le tremblement de la barre entre 1 et 2 chiffres.
  const feedbackBadge = (count: number) =>
    isAdmin && count > 0 ? (
      <span
        aria-label={count + ' retour(s) non trié(s)'}
        className='ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold align-middle'
      >
        {count > 9 ? '9+' : count}
      </span>
    ) : null;

  const linkClass = (href: string) =>
    `text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors whitespace-nowrap ${pathname.startsWith(href) ? 'font-medium text-accent' : ''}`;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-14">
          <Link href="/" onClick={() => { setIsMobileMenuOpen(false); setIsMoreOpen(false); }} className="text-base sm:text-lg font-bold text-accent truncate">
            Meal Plan
          </Link>

          <div className="hidden md:flex gap-3 lg:gap-4 items-center">
            {session ? (
              <>
                {MAIN_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                    {item.label}
                  </Link>
                ))}

                <div className="relative" ref={moreRef}>
                  <button
                    onClick={() => setIsMoreOpen(!isMoreOpen)}
                    aria-haspopup="menu"
                    aria-expanded={isMoreOpen}
                    className={`flex items-center gap-1 text-xs sm:text-sm transition-colors whitespace-nowrap ${moreItems.some((i) => pathname.startsWith(i.href)) ? 'font-medium text-accent' : 'text-gray-600 hover:text-accent'}`}
                  >
                    Plus
                    {feedbackBadge(newFeedbackCount)}
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isMoreOpen && (
                    <div role="menu" className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30">
                      {moreItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setIsMoreOpen(false)}
                          className={`block px-4 py-2 text-xs sm:text-sm transition-colors ${pathname.startsWith(item.href) ? 'font-medium text-accent' : 'text-gray-600 hover:bg-accent-soft hover:text-accent'}`}
                        >
                          {item.label}
                          {item.href === '/feedback' && feedbackBadge(newFeedbackCount)}
                        </Link>
                      ))}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={handleSignOut}
                        role="menuitem"
                        className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link href="/login" className="text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors">Se connecter</Link>
            )}
            <ThemeToggle />
          </div>

          <div className="md:hidden flex items-center gap-1">
            {session ? (
              <button
                onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); setIsMoreOpen(false); }}
                className="p-1.5 sm:p-2 rounded text-gray-600 hover:text-accent hover:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label="Menu"
                aria-expanded={isMobileMenuOpen}
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            ) : (
              <Link href="/login" className="text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors">Se connecter</Link>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Fond overlay sous le menu mobile : un clic en dehors le ferme */}
        {isMobileMenuOpen && session && (
          <div
            className="fixed top-12 sm:top-14 inset-x-0 bottom-0 z-10 bg-black/25 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {isMobileMenuOpen && session && (
          <div className="md:hidden relative z-20 bg-white border-t border-gray-100 px-3 sm:px-4 pb-3">
            <div className="flex flex-col gap-2">
              {MAIN_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`${linkClass(item.href)} py-2`}>
                  {item.label}
                  {item.href === '/feedback' && feedbackBadge(newFeedbackCount)}
                </Link>
              ))}
              {moreItems.length > 0 && <div className="border-t border-gray-100 mt-1 pt-1" />}
              {moreItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`${linkClass(item.href)} py-2`}>
                  {item.label}
                  {item.href === '/feedback' && feedbackBadge(newFeedbackCount)}
                </Link>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-1">
                <button onClick={handleSignOut} className="w-full text-left text-xs sm:text-sm text-red-600 hover:text-red-700 transition-colors py-2">
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
