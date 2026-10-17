// lib/themes.ts — Palettes de couleurs (F14).
//
// Chaque thème définit : l'accent UI (boutons, liens, focus) ET les quatre
// couleurs de badges par type de repas (petit-déj/déjeuner/goûter/dîner),
// déclinées en clair et sombre. Les couleurs de badges suivent le pattern
// actuel : fond pastel + texte foncé (clair) / fond sombre + texte clair
// (sombre), avec le remappage Tailwind existant.
//
// Conception (recherche WCAG/Okabe-Ito, 2026-10) :
// - les 4 teintes de badges sont choisies distinguishables entre elles,
//   y compris pour les principales deficiencies de vision (le trio
//   bleu/orange est le plus sûr ; on evite les paires rouge/vert pures
//   adjacentes) ;
// - l'accent respecte WCAG AA : texte blanc sur accent clair >= 4.5:1,
//   et les remappages sombres gardent un texte lisible (>= 4.5:1) ;
// - les pastels de badges gardent leurs textes -800 (clair) et les fonds
//   -50 sombres leurs textes -300 (contraste eleve dans les deux modes).

export interface ThemePalette {
  // Accent UI — clair : bouton plein, liens, focus (texte blanc dessus)
  accentLight: string;
  accentHoverLight: string;
  accentSoftLight: string;
  // Accent UI — sombre : idem sur fond sombre (texte sombre -800 dessus,
  // cf. remappage --color-white dans globals.css)
  accentDark: string;
  accentHoverDark: string;
  accentSoftDark: string;
  // Badges par type de repas — mode clair (fond pastel + texte foncé)
  breakfastLight: string; // ex. bg-orange-100 text-orange-800
  lunchLight: string;
  snackLight: string;
  dinnerLight: string;
  // Badges — mode sombre (fond -50 sombre + texte clair -300)
  breakfastDark: string;
  lunchDark: string;
  snackDark: string;
  dinnerDark: string;
}

export interface ThemeDefinition {
  id: string;
  label: string;
  // Couleur representative pour l'aperçu (swatch du sélecteur)
  swatch: string;
  palette: ThemePalette;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'teal',
    label: 'Teal (défaut)',
    swatch: '#0f766e',
    palette: {
      // Teal actuel — inchangé (référence)
      accentLight: '#0f766e',
      accentHoverLight: '#115e59',
      accentSoftLight: '#ccfbf1',
      accentDark: '#2dd4bf',
      accentHoverDark: '#5eead4',
      accentSoftDark: '#134e4a',
      breakfastLight: 'bg-orange-100 text-orange-800',
      lunchLight: 'bg-blue-100 text-blue-800',
      snackLight: 'bg-green-100 text-green-800',
      dinnerLight: 'bg-purple-100 text-purple-800',
      breakfastDark: 'bg-orange-50 text-orange-300',
      lunchDark: 'bg-blue-50 text-blue-300',
      snackDark: 'bg-green-50 text-green-300',
      dinnerDark: 'bg-purple-50 text-purple-300',
    },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    swatch: '#4338ca',
    palette: {
      accentLight: '#4338ca',
      accentHoverLight: '#3730a3',
      accentSoftLight: '#e0e7ff',
      accentDark: '#818cf8',
      accentHoverDark: '#a5b4fc',
      accentSoftDark: '#1e1b4b',
      // Bleu interdit pour déjeuner (confusion avec l'accent) → orange pour
      // petit-déj, bleu plus clair déjeune, vert goûter, violet dîner
      breakfastLight: 'bg-amber-100 text-amber-800',
      lunchLight: 'bg-sky-100 text-sky-800',
      snackLight: 'bg-green-100 text-green-800',
      dinnerLight: 'bg-purple-100 text-purple-800',
      breakfastDark: 'bg-amber-50 text-amber-300',
      lunchDark: 'bg-sky-50 text-sky-300',
      snackDark: 'bg-green-50 text-green-300',
      dinnerDark: 'bg-purple-50 text-purple-300',
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: '#be123c',
    palette: {
      accentLight: '#be123c',
      accentHoverLight: '#9f1239',
      accentSoftLight: '#ffe4e6',
      accentDark: '#fb7185',
      accentHoverDark: '#fda4af',
      accentSoftDark: '#4c0519',
      // Petit-déj rose (proche accent assumé), déjeuner bleu, goûter vert, dîner violet
      breakfastLight: 'bg-rose-100 text-rose-800',
      lunchLight: 'bg-blue-100 text-blue-800',
      snackLight: 'bg-green-100 text-green-800',
      dinnerLight: 'bg-purple-100 text-purple-800',
      breakfastDark: 'bg-rose-50 text-rose-300',
      lunchDark: 'bg-blue-50 text-blue-300',
      snackDark: 'bg-green-50 text-green-300',
      dinnerDark: 'bg-purple-50 text-purple-300',
    },
  },
  {
    id: 'amber',
    label: 'Ambre',
    swatch: '#b45309',
    palette: {
      accentLight: '#b45309',
      accentHoverLight: '#92400e',
      accentSoftLight: '#fef3c7',
      accentDark: '#fbbf24',
      accentHoverDark: '#fcd34d',
      accentSoftDark: '#451a03',
      // Petit-déj ambre (proche accent assumé), déjeuner bleu, goûter vert, dîner violet
      breakfastLight: 'bg-amber-100 text-amber-800',
      lunchLight: 'bg-blue-100 text-blue-800',
      snackLight: 'bg-green-100 text-green-800',
      dinnerLight: 'bg-purple-100 text-purple-800',
      breakfastDark: 'bg-amber-50 text-amber-300',
      lunchDark: 'bg-blue-50 text-blue-300',
      snackDark: 'bg-green-50 text-green-300',
      dinnerDark: 'bg-purple-50 text-purple-300',
    },
  },
  {
    id: 'forest',
    label: 'Vert forêt',
    swatch: '#15803d',
    palette: {
      accentLight: '#15803d',
      accentHoverLight: '#166534',
      accentSoftLight: '#dcfce7',
      accentDark: '#4ade80',
      accentHoverDark: '#86efac',
      accentSoftDark: '#14532d',
      // Goûter vert (proche accent assumé) ; petit-déj orange, déjeuner bleu,
      // dîner violet — trio orange/bleu/violet colorblind-safe
      breakfastLight: 'bg-orange-100 text-orange-800',
      lunchLight: 'bg-blue-100 text-blue-800',
      snackLight: 'bg-green-100 text-green-800',
      dinnerLight: 'bg-purple-100 text-purple-800',
      breakfastDark: 'bg-orange-50 text-orange-300',
      lunchDark: 'bg-blue-50 text-blue-300',
      snackDark: 'bg-green-50 text-green-300',
      dinnerDark: 'bg-purple-50 text-purple-300',
    },
  },
];

export const DEFAULT_THEME_ID = 'teal';

export function getTheme(id: string | null | undefined): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

// Valeurs CSS des accents pour injection dans <style> dynamique : le thème
// pilote les variables --color-accent utilisées par tout le design system.
export function themeCssVariables(theme: ThemeDefinition, isDark: boolean): string {
  const p = theme.palette;
  if (isDark) {
    return `--color-accent:${p.accentDark};--color-accent-hover:${p.accentHoverDark};--color-accent-soft:${p.accentSoftDark};`;
  }
  return `--color-accent:${p.accentLight};--color-accent-hover:${p.accentHoverLight};--color-accent-soft:${p.accentSoftLight};`;
}

// Classes de badges par type de repas pour le thème courant (PlannerBoard,
// page publique). Retourne un Record mealType -> classes.
export function themeMealColors(theme: ThemeDefinition, isDark: boolean): Record<string, string> {
  const p = theme.palette;
  if (isDark) {
    return {
      breakfast: p.breakfastDark,
      lunch: p.lunchDark,
      snack: p.snackDark,
      dinner: p.dinnerDark,
    };
  }
  return {
    breakfast: p.breakfastLight,
    lunch: p.lunchLight,
    snack: p.snackLight,
    dinner: p.dinnerLight,
  };
}
