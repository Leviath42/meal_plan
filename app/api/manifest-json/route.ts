// app/api/manifest-json/route.ts — Manifest PWA dynamique (F14) :
// theme_color et background_color suivent la palette choisie dans les
// paramètres. Sert l'URL /api/manifest-json, exposée en /manifest.json via une rewrite
// du next.config (le <link> du layout ne change pas d'URL).
import { NextResponse } from 'next/server';

// Manifest désormais 100 % statique (C-044) : le splash et les barres
// Android suivent des couleurs NEUTRES — une couleur liée à la palette
// étant figée à l'installation, elle devenait obsolète au premier
// changement de thème. Neutre = toujours correct, et plus de lecture
// de base à chaque requête du manifest.
export async function GET() {
  return NextResponse.json(
    {
      name: 'Meal Plan',
      short_name: 'Meal Plan',
      description: 'Planification des repas et gestion de recettes',
      lang: 'fr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      // Splash + barre inférieure Android (C-045) : noir profond — cohérent
      // avec l'icône neutre (fond noir) et l'usage principal en mode sombre.
      // Valeur unique du manifest (pas de media-query possible ici) : le
      // système clair reçoit une meta theme-color claire dans le HTML.
      background_color: '#0c0c0e',
      // Barre d'application (C-043) : Android fige la couleur à
      // l'INSTALLATION depuis ce champ — lier la barre à la palette est
      // voué à l'échec. Neutre : gris anthracite discret, compatible avec
      // toutes les palettes ; le mode suit le SYSTÈME via les media-queries
      // (seul mécanisme respecté). En mode clair système, Chrome prend la
      // meta light (blanc cassé), en sombre la meta dark (anthracite).
      theme_color: '#0c0c0e',
      icons: [
        {
          src: '/icons/icon-192.png?v=4',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/icon-512.png?v=4',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    { headers: { 'Cache-Control': 'no-cache' } },
  );
}
