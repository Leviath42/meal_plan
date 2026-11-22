// Test MP10 — jours fériés France (lib/holidays-fr.ts), dates de référence connues.
import { getFrenchHoliday, getFrenchHolidays } from '../lib/holidays-fr';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    pass += 1;
    console.log(`PASS ${label}`);
  } else {
    fail += 1;
    console.error(`FAIL ${label} : attendu=${JSON.stringify(expected)} obtenu=${JSON.stringify(actual)}`);
  }
}

const d = (s: string) => new Date(`${s}T00:00:00`);

// Fêtes fixes
check('2026-01-01', getFrenchHoliday(d('2026-01-01')), "Jour de l'An");
check('2026-07-14', getFrenchHoliday(d('2026-07-14')), 'Fête nationale');
check('2026-11-11', getFrenchHoliday(d('2026-11-11')), 'Armistice 1918');
// Mobiles 2026 (Pâques 05/04) : Lundi de Pâques 06/04, Ascension 14/05, Lundi de Pentecôte 25/05
check('2026 Lundi de Pâques', getFrenchHoliday(d('2026-04-06')), 'Lundi de Pâques');
check('2026 Ascension', getFrenchHoliday(d('2026-05-14')), 'Ascension');
check('2026 Lundi de Pentecôte', getFrenchHoliday(d('2026-05-25')), 'Lundi de Pentecôte');
// Mobiles 2027 (Pâques 28/03) : Lundi de Pâques 29/03, Ascension 06/05, Lundi de Pentecôte 17/05
check('2027 Lundi de Pâques', getFrenchHoliday(d('2027-03-29')), 'Lundi de Pâques');
check('2027 Ascension', getFrenchHoliday(d('2027-05-06')), 'Ascension');
check('2027 Lundi de Pentecôte', getFrenchHoliday(d('2027-05-17')), 'Lundi de Pentecôte');
// Mobiles 2025 (Pâques 20/04) : Lundi de Pâques 21/04, Ascension 29/05
check('2025 Lundi de Pâques', getFrenchHoliday(d('2025-04-21')), 'Lundi de Pâques');
check('2025 Ascension', getFrenchHoliday(d('2025-05-29')), 'Ascension');
// Jours ouvrés
check('2026-03-17 ouvré', getFrenchHoliday(d('2026-03-17')), null);
check('2026-05-13 ouvré (veille Ascension)', getFrenchHoliday(d('2026-05-13')), null);
check('2026-05-24 ouvré (dimanche de Pentecôte)', getFrenchHoliday(d('2026-05-24')), null);
// Compteur : 11 fériés par an (métropole)
check('11 fériés en 2026', getFrenchHolidays(2026).size, 11);
check('11 fériés en 2027', getFrenchHolidays(2027).size, 11);

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
