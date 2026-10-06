'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut as clientSignOut } from "next-auth/react";

export default function Nav({ session }: { session: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await clientSignOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-14">
          <Link href="/" className="text-base sm:text-lg font-bold text-blue-600 truncate">
            Meal Plan
          </Link>

          <div className="hidden md:flex gap-3 lg:gap-4 items-center">
            {session ? (
              <>
                <Link href="/recipes" className={`text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors whitespace-nowrap ${pathname.startsWith('/recipes') ? 'font-medium text-blue-600' : ''}`}>
                  Recettes
                </Link>
                <Link href="/ingredients" className={`text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors whitespace-nowrap ${pathname.startsWith('/ingredients') ? 'font-medium text-blue-600' : ''}`}>
                  Ingrédients
                </Link>
                {session.user?.role === "ADMIN" && (
                  <Link href="/register" className={`text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors whitespace-nowrap ${pathname.startsWith('/register') ? 'font-medium text-blue-600' : ''}`}>
                    Utilisateurs
                  </Link>
                )}
                <span className="text-gray-300 hidden lg:inline">|</span>
                <button onClick={handleSignOut} className="text-xs sm:text-sm text-gray-600 hover:text-red-600 transition-colors whitespace-nowrap">
                  Déconnexion
                </button>
              </>
            ) : (
              <Link href="/login" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors">Se connecter</Link>
            )}
          </div>

          <div className="md:hidden">
            {session ? (
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1.5 sm:p-2 rounded text-gray-600 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Menu">
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            ) : (
              <Link href="/login" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors">Se connecter</Link>
            )}
          </div>
        </div>

        {isMobileMenuOpen && session && (
          <div className="md:hidden bg-white border-t border-gray-100 px-3 sm:px-4 pb-3">
            <div className="flex flex-col gap-2">
              <Link href="/recipes" onClick={() => setIsMobileMenuOpen(false)} className={`text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors py-2 ${pathname.startsWith('/recipes') ? 'font-medium text-blue-600' : ''}`}>
                Recettes
              </Link>
              <Link href="/ingredients" onClick={() => setIsMobileMenuOpen(false)} className={`text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors py-2 ${pathname.startsWith('/ingredients') ? 'font-medium text-blue-600' : ''}`}>
                Ingrédients
              </Link>
              {session.user?.role === "ADMIN" && (
                <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className={`text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors py-2 ${pathname.startsWith('/register') ? 'font-medium text-blue-600' : ''}`}>
                  Gérer les utilisateurs
                </Link>
              )}
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
