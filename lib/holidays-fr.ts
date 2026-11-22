// Jours fériés France métropolitaine — calcul local, sans appel réseau ni dépendance.
// Décision MP10 : les 11 dates sont déterministes (fêtes fixes + Pâques),
// une API ouverte externe n'apporterait qu'un point de défaillance pour rien.
// Hors périmètre (volontaire) : Alsace-Moselle (Bon Vendredi, 26 décembre).

const HOLIDAY_CACHE = new Map<number, Map<string, string>>();

// Dimanche de Pâques — algorithme grégorien (Meeus/Jones/Butcher)
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const cc = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(cc / 4);
  const k = cc % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function fixedHolidays(year: number): Array<[string, string]> {
  return [
    [dateKey(year, 1, 1), "Jour de l'An"],
    [dateKey(year, 5, 1), 'Fête du Travail'],
    [dateKey(year, 5, 8), 'Victoire 1945'],
    [dateKey(year, 7, 14), 'Fête nationale'],
    [dateKey(year, 8, 15), 'Assomption'],
    [dateKey(year, 11, 1), 'Toussaint'],
    [dateKey(year, 11, 11), 'Armistice 1918'],
    [dateKey(year, 12, 25), 'Noël'],
  ];
}

// Fêtes mobiles indexées sur Pâques : Lundi de Pâques (+1), Ascension (+39), Lundi de Pentecôte (+50)
function easterHolidays(year: number): Array<[string, string]> {
  const easter = easterSunday(year);
  const shift = (days: number) => {
    const d = new Date(easter);
    d.setDate(d.getDate() + days);
    return dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
  };
  return [
    [shift(1), 'Lundi de Pâques'],
    [shift(39), 'Ascension'],
    [shift(50), 'Lundi de Pentecôte'],
  ];
}

export function getFrenchHolidays(year: number): Map<string, string> {
  const cached = HOLIDAY_CACHE.get(year);
  if (cached) return cached;
  const holidays = new Map<string, string>([...fixedHolidays(year), ...easterHolidays(year)]);
  HOLIDAY_CACHE.set(year, holidays);
  return holidays;
}

// Nom du jour férié à la date donnée, ou null si jour ouvré.
// La Date est interprétée en minuit local comme partout dans l'app.
export function getFrenchHoliday(date: Date): string | null {
  const key = dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return getFrenchHolidays(date.getFullYear()).get(key) ?? null;
}
