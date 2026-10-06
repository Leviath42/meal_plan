// lib/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Empêche la multiplication des instances en mode dev avec Next.js
const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
};

const sqlite = globalForDb.sqlite ?? new Database('data/sqlite.db');

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sqlite = sqlite;
}

// L'objet `db` servira pour toutes les requêtes de l'application
export const db = drizzle(sqlite, { schema });