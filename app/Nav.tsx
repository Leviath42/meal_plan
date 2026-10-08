'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from "next-auth/react";
import { Session } from "next-auth";
import ThemeToggle from './ThemeToggle';

export default function Nav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Touche Échap : fermer le menu mobile quand il est ouvert
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-14">
          <Link href="/" className="text-base sm:text-lg font-bold text-accent truncate">
            Meal Plan
          </Link>

          <div className="hidden md:flex gap-3 lg:gap-4 items-center">
            {session ? (
              <>
                <Link href="/calendar" className={`text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors whitespace-nowrap ${pathname.startsWith('/calendar') ? 'font-medium text-accent' : ''}`}>
                  Calendrier
                </Link>
                <Link href="/recipes" className={`text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors whitespace-nowrap ${pathname.startsWith('/recipes') ? 'font-medium text-accent' : ''}`}>
                  Recettes
                </Link>
                <Link href="/ingredients" className={`text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors whitespace-nowrap ${pathname.startsWith('/ingredients') ? 'font-medium text-accent' : ''}`}>
                  Ingrédients
                </Link>
                <Link href="/shopping-list" className={`text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors whitespace-nowrap ${pathname.startsWith('/shopping-list') ? 'font-medium text-accent' : ''}`}>Courses</Link>
                <Link href="/settings" className={`text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors whitespace-nowrap ${pathname.startsWith('/settings') ? 'font-medium text-accent' : ''}`}>Paramètres</Link>
                <span className="text-gray-300 hidden lg:inline">|</span>
                <button onClick={handleSignOut} className="text-xs sm:text-sm text-gray-600 hover:text-red-600 transition-colors whitespace-nowrap">
                  Déconnexion
                </button>
              </>
            ) : (
              <Link href="/login" className="text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors">Se connecter</Link>
            )}
            <ThemeToggle />
          </div>

          <div className="md:hidden flex items-center gap-1">
            {session ? (
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1.5 sm:p-2 rounded text-gray-600 hover:text-accent hover:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent" aria-label="Menu">
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
              <Link href="/calendar" onClick={() => setIsMobileMenuOpen(false)} className={`text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors py-2 ${pathname.startsWith('/calendar') ? 'font-medium text-accent' : ''}`}>
                Calendrier
              </Link>
              <Link href="/recipes" onClick={() => setIsMobileMenuOpen(false)} className={`text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors py-2 ${pathname.startsWith('/recipes') ? 'font-medium text-accent' : ''}`}>
                Recettes
              </Link>
              <Link href="/ingredients" onClick={() => setIsMobileMenuOpen(false)} className={`text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors py-2 ${pathname.startsWith('/ingredients') ? 'font-medium text-accent' : ''}`}>
                Ingrédients
              </Link>
              <Link href="/shopping-list" onClick={() => setIsMobileMenuOpen(false)} className={`text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors whitespace-nowrap ${pathname.startsWith('/shopping-list') ? 'font-medium text-accent' : ''}`}>Courses</Link>
              <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className={`text-xs sm:text-sm text-gray-600 hover:text-accent transition-colors py-2 ${pathname.startsWith('/settings') ? 'font-medium text-accent' : ''}`}>Paramètres</Link>

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
