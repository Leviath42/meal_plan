'use client';

import { useEffect, useState } from 'react';

// Bascule clair/sombre : persistée dans localStorage, défaut = préférence système.
// La classe .dark est posée sur <html> et remappe la palette (voir styles/globals.css).
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch (e) {
      // localStorage indisponible : le thème ne sera pas persisté
    }
  };

  const buttonClass = 'p-1.5 rounded text-gray-600 hover:text-accent hover:bg-gray-100 transition-colors';

  // Avant hydration, rendu de forme identique pour éviter un décalage de layout
  if (!mounted) {
    return <button className={buttonClass} aria-label="Changer de thème" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className={buttonClass}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label="Changer de thème"
    >
      {isDark ? (
        // Soleil (cliquer repasse en mode clair)
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        // Lune (cliquer passe en mode sombre)
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
