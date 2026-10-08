// scripts/db-ensure.ts
// Réconciliation idempotente de la base SQLite avec les migrations drizzle.
//
// Pourquoi ce script existe : la table __drizzle_migrations de certaines bases
// (dev commitée, sauvegardes de prod) contient des lignes héritées d'un ancien
// jeu de migrations. drizzle-kit migrate croit alors que tout est appliqué
// (ou tente de rejouer la migration 0000 et échoue), alors que le schéma réel
// est en retard. Ce script :
//   1. applique chaque statement des fichiers de migration UNIQUEMENT s'il
//      n'est pas déjà matérialisé (table/index existant, colonne présente) ;
//   2. réaligne __drizzle_migrations sur drizzle/meta/_journal.json, ce qui
//      rend `npm run db:migrate` à nouveau sûr et fonctionnel.
//
// Idempotent : peut être exécuté autant de fois que nécessaire (update.sh
// l'appelle à chaque déploiement).

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsFolder = process.argv[2] ?? path.join(process.cwd(), 'drizzle');
// Le chemin de base n'est passé en argument que pour les tests ; en déploiement
// on utilise toujours la base de l'application.
const dbPath =
  process.argv[3] ?? path.join(process.cwd(), 'data', 'sqlite.db');

const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
if (!existsSync(journalPath)) {
  console.error(`Journal introuvable : ${journalPath}`);
  process.exit(1);
}

type JournalEntry = { idx: number; when: number; tag: string };
const journal: { entries: JournalEntry[] } = JSON.parse(
  readFileSync(journalPath, 'utf8'),
);

const sqlite = new Database(dbPath);
const applied: string[] = [];

function tableExists(name: string): boolean {
  return !!sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
}

function indexExists(name: string): boolean {
  return !!sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?")
    .get(name);
}

function columnExists(table: string, column: string): boolean {
  const columns = sqlite
    .prepare(`PRAGMA table_info("${table}")`)
    .all() as { name: string }[];
  return columns.some((c) => c.name === column);
}

// Évalue si un statement est déjà matérialisé. Retourne true si le statement
// doit être exécuté, false s'il faut le sauter, et une string en cas d'erreur
// (forme non reconnue à vérifier à la main).
function shouldRun(statement: string): boolean | string {
  const trimmed = statement.trim();

  const createTable = trimmed.match(
    /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([\w]+)`?/i,
  );
  if (createTable) return !tableExists(createTable[1]);

  const createIndex = trimmed.match(
    /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([\w]+)`?/i,
  );
  if (createIndex) return !indexExists(createIndex[1]);

  const alterAdd = trimmed.match(
    /^ALTER\s+TABLE\s+`?([\w]+)`?\s+ADD\s+(?:COLUMN\s+)?`?([\w]+)`?/i,
  );
  if (alterAdd) return !columnExists(alterAdd[1], alterAdd[2]);

  return `Statement non reconnu, à traiter manuellement :\n${trimmed}`;
}

try {
  sqlite.pragma('foreign_keys = ON');
  const run = sqlite.transaction(() => {
    // 1. Matérialisation du schéma, statement par statement
    for (const entry of journal.entries) {
      const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
      if (!existsSync(sqlPath)) {
        throw new Error(`Fichier de migration introuvable : ${sqlPath}`);
      }
      for (const statement of readFileSync(sqlPath, 'utf8').split(
        '--> statement-breakpoint',
      )) {
        if (!statement.trim()) continue;
        const verdict = shouldRun(statement);
        if (typeof verdict === 'string') throw new Error(verdict);
        if (verdict) {
          sqlite.exec(statement);
          const label = statement.trim().split('\n')[0].slice(0, 90);
          applied.push(`${entry.tag} : ${label}`);
        }
      }
    }

    // 2. Réalignement du journal des migrations
    sqlite.exec(`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )`);
    const realign = sqlite.prepare(
      'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)',
    );
    const currentRows = sqlite
      .prepare('SELECT hash, created_at FROM "__drizzle_migrations"')
      .all() as { hash: string; created_at: number | null }[];

    const expected = journal.entries.map((entry) => {
      const content = readFileSync(
        path.join(migrationsFolder, `${entry.tag}.sql`),
        'utf8',
      );
      return {
        hash: createHash('sha256').update(content).digest('hex'),
        created_at: entry.when,
      };
    });

    const same =
      currentRows.length === expected.length &&
      expected.every((e) =>
        currentRows.some((c) => c.hash === e.hash && Number(c.created_at) === e.created_at),
      );

    if (!same) {
      sqlite.exec('DELETE FROM "__drizzle_migrations"');
      for (const row of expected) realign.run(row.hash, row.created_at);
      applied.push(
        `journal __drizzle_migrations réaligné (${expected.length} entrées, ${currentRows.length} avant)`,
      );
    }
  });
  run();

  if (applied.length === 0) {
    console.log('Base déjà conforme au schéma (aucun changement).');
  } else {
    console.log('Corrections appliquées :');
    for (const line of applied) console.log(`  - ${line}`);
  }
  console.log('db-ensure : OK');
} catch (error) {
  console.error(`db-ensure : ÉCHEC — ${error instanceof Error ? error.message : error}`);
  process.exit(1);
} finally {
  sqlite.close();
}
