'use client';

// Enregistrement du Service Worker (PWA) — après le chargement complet de la
// page pour ne pas concurrencer l'hydratation. Échec silencieux : sans SW,
// l'application fonctionne normalement ( juste non installable ).
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // HTTPS requis ou contexte non sécurisé : on ignore
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
