// lib/format.ts
// Formatage partagé des quantités et des dates en français.
//
// Implémentation manuelle (pas d'Intl) : le rendu doit être strictement
// identique côté serveur et client — Node et le navigateur (surtout iOS)
// peuvent formater différemment avec toLocaleDateString/toLocaleString, ce
// que React traite comme une erreur d'hydratation (re-rendu complet de la
// page, console bruitée, ressenti de flash).

// ============================================================================
// Quantités
// ============================================================================

// Arrondi à 2 décimales, virgule française, zéros inutiles supprimés :
// 2.667 -> "2,67", 333.333 -> "333,33", 4 -> "4", 1.5 -> "1,5".
export function formatQuantity(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const [integer, decimals] = rounded.toString().split('.');
  return decimals ? `${integer},${decimals}` : integer;
}

// ============================================================================
// Dates (indexés comme Date : getDay() 0 = dimanche, getMonth() 0 = janvier)
// ============================================================================

const WEEKDAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const WEEKDAYS_FR_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const MONTHS_FR_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// « lundi 3 octobre » (minuscules, comme la locale fr)
export function formatWeekdayDayMonth(date: Date): string {
  return `${WEEKDAYS_FR[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]}`;
}

// « Lundi 3 octobre 2026 »
export function formatWeekdayDayMonthYear(date: Date): string {
  return `${capitalize(formatWeekdayDayMonth(date))} ${date.getFullYear()}`;
}

// « 3 octobre 2026 »
export function formatDayMonthYear(date: Date): string {
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

// « 3 oct. 2026 » (jours/mois UTC d'un timestamp ISO)
export function formatUtcDayShortMonthYear(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS_FR_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// « LUNDI » (jour long en majuscules)
export function formatWeekdayLongUpper(date: Date): string {
  return WEEKDAYS_FR[date.getDay()].toUpperCase();
}

// « LUN » (jour court en majuscules, sans point)
export function formatShortWeekdayUpper(date: Date): string {
  return WEEKDAYS_FR_SHORT[date.getDay()].toUpperCase().replace('.', '');
}

// « Octobre 2026 »
export function formatMonthYear(date: Date): string {
  return `${capitalize(MONTHS_FR[date.getMonth()])} ${date.getFullYear()}`;
}

// ============================================================================
// Dates locales YYYY-MM-DD (fuseau du navigateur/serveur, sans décalage UTC :
// toISOString() formaterait minuit local en UTC et décalerait d'un jour)
// ============================================================================

// Formater une Date en YYYY-MM-DD selon le fuseau local
export function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parser une date YYYY-MM-DD en Date locale (minuit local)
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// « 03/10/2026 » (équivalent du toLocaleDateString('fr-FR') par défaut)
export function formatNumericDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}
