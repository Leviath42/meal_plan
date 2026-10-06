// lib/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { runMigrations } from './migrate';

// Empêche la multiplication des instances en mode dev avec Next.js
const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
  migrationsRun: boolean | undefined;
};

const sqlite = globalForDb.sqlite ?? new Database('sqlite.db');

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sqlite = sqlite;
}

// Exécuter les migrations automatiquement au premier appel
if (!globalForDb.migrationsRun) {
  runMigrations().then(() => {
    globalForDb.migrationsRun = true;
  }).catch(console.error);
}

// L'objet `db` servira pour toutes les requêtes de l'application
export const db = drizzle(sqlite, { schema });