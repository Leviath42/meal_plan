// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    // Même base que celle utilisée par l'application (lib/db/index.ts)
    url: './data/sqlite.db',
  },
});
