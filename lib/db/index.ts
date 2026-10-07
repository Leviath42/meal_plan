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

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sqlite = sqlite;
}

// L'objet `db` servira pour toutes les requêtes de l'application
export const db = drizzle(sqlite, { schema });
