// app/api/manifest-json/route.ts — Manifest PWA dynamique (F14) :
// theme_color et background_color suivent la palette choisie dans les
// paramètres. Sert l'URL /api/manifest-json, exposée en /manifest.json via une rewrite
// du next.config (le <link> du layout ne change pas d'URL).
import { NextResponse } from 'next/server';
import { getPublicAppSettings } from '@/app/actions/settings';
import { getTheme } from '@/lib/themes';

export const dynamic = 'force-dynamic';

export async function GET() {
  let themeAccent = '#0f766e';
  try {
    const settings = await getPublicAppSettings();
    themeAccent = getTheme(settings.theme).palette.accentLight;
  } catch {
    // défauts teal (base injoignable)
  }

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
      background_color: themeAccent,
      // Barre d'application (C-043) : Android fige la couleur à
      // l'INSTALLATION depuis ce champ — lier la barre à la palette est
      // voué à l'échec. Neutre : gris anthracite discret, compatible avec
      // toutes les palettes ; le mode suit le SYSTÈME via les media-queries
      // (seul mécanisme respecté). En mode clair système, Chrome prend la
      // meta light (blanc cassé), en sombre la meta dark (anthracite).
      theme_color: '#18181b',
      icons: [
        {
          src: '/icons/icon-192.png?v=3',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/icon-512.png?v=3',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    { headers: { 'Cache-Control': 'no-cache' } },
  );
}
