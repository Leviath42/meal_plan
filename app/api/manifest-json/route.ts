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
      theme_color: themeAccent,
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
