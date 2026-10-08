// next.config.ts
// En-têtes de sécurité appliqués à toutes les réponses :
// - X-Frame-Options DENY : pas d'affichage de l'app dans une iframe
//   tierce (clickjacking d'une page authentifiée) ;
// - X-Content-Type-Options nosniff : le navigateur ne devine plus les types
//   de contenu ;
// - Referrer-Policy no-referrer : aucun Referer sortant — indispensable ici
//   car les URLs de partage contiennent le jeton (?token=…), qui ne doit
//   fuiter ni dans l'historique ni vers les domaines cliqués ;
// - Permissions-Policy : APIs sensibles désactivées (inutiles à l'app).
//
// Pas de CSP pour l'instant : le script inline anti-flash du thème dans
// app/layout.tsx et les scripts internes de Next exigeraient un nonce ou
// des hashes à chaque build — à faire en travail dédié si le besoin survient.
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
