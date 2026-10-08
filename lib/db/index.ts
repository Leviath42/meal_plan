// lib/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'node:path';
import * as schema from './schema';

// Chemin absolu construit depuis la racine du projet : un chemin relatif
// dépendrait du répertoire de travail courant (fragile en build/production).
const dbPath = path.join(process.cwd(), 'data', 'sqlite.db');

// Empêche la multiplication des instances en mode dev avec Next.js
const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
};

const sqlite = globalForDb.sqlite ?? new Database(dbPath);

// SQLite laisse les clés étrangères DÉSACTIVÉES par défaut et par connexion :
// sans ce pragma, toutes les clauses ON DELETE du schéma (cascade, set null)
// sont inertes et les suppressions laissent des lignes orphelines.
sqlite.pragma('foreign_keys = ON');

// WAL : les lectures ne bloquent plus les écritures et vice-versa (utile quand
// db:ensure / create-admin tournent pendant que l'app est lancée). busy_timeout :
// au lieu d'échouer immédiatement en SQLITE_BUSY, on attend jusqu'à 5 s.
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sqlite = sqlite;
}

// L'objet `db` servira pour toutes les requêtes de l'application
export const db = drizzle(sqlite, { schema });
