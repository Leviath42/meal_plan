import { db } from './index';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Execute all pending migrations
 */
export async function runMigrations() {
  try {
    // Get all migration files sorted by name
    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migrations found');
      return;
    }

    // Create migrations tracking table if it doesn't exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Execute each migration
    for (const migrationFile of migrationFiles) {
      const filePath = join(MIGRATIONS_DIR, migrationFile);
      const sql = readFileSync(filePath, 'utf-8');
      
      // Generate a simple hash based on filename
      const hash = `migration_${migrationFile}`;
      
      // Check if migration was already applied
      const [existing] = await db
        .select()
        .from('__drizzle_migrations')
        .where('hash = ?', hash)
        .limit(1);

      if (existing) {
        console.log(`Migration ${migrationFile} already applied, skipping`);
        continue;
      }

      // Execute the migration
      console.log(`Applying migration: ${migrationFile}`);
      await db.run(sql);
      
      // Record the migration
      await db.run(`INSERT INTO __drizzle_migrations (hash) VALUES (?)`, hash);
      console.log(`Migration ${migrationFile} applied successfully`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

// Run migrations immediately when this module is imported in development
if (process.env.NODE_ENV === 'development') {
  runMigrations().catch(console.error);
}
