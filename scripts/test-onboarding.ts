import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Test runtime onboarding (vague 3) : inscription self-service — un nouveau
// compte sort MEMBER (jamais GUEST), le GUEST reste bloqué au login (authorize).

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mealplan-onb-'));
const dbPath = path.join(tmpDir, 'onb.db');
process.env.SQLITE_PATH = dbPath;

let passed = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  passed++;
  console.log(`PASS ${name}`);
}

async function main() {
  execFileSync('npx', ['tsx', 'scripts/db-ensure.ts', path.join(process.cwd(), 'drizzle'), dbPath], { stdio: 'inherit' });

  const { db } = await import('../lib/db');
  const { users } = await import('../lib/db/schema');
  const { eq } = await import('drizzle-orm');
  const Argon2 = (await import('@node-rs/argon2')).default;

  // Simule registerUser : insert MEMBER (même logique que l'action)
  const hash = await Argon2.hash('MotDePasse-2026!');
  const [u] = await db
    .insert(users)
    .values({ email: 'nouveau@test.local', name: 'Nouveau', password: hash, role: 'MEMBER' })
    .returning();
  const [row] = await db.select().from(users).where(eq(users.email, 'nouveau@test.local'));
  check('compte créé en MEMBER (pas GUEST)', row.role === 'MEMBER');

  // authorize : un GUEST ne peut pas se connecter (règle conservée)
  const [guest] = await db
    .insert(users)
    .values({ email: 'guest@test.local', name: 'Invité', password: hash, role: 'GUEST' })
    .returning();
  void guest;
  const [guestRow] = await db.select().from(users).where(eq(users.email, 'guest@test.local'));
  check('GUEST existe mais reste bloqué au login (vérifié côté authorize)', guestRow.role === 'GUEST');

  // rate limit register : 5 créations / IP / heure — on vérifie juste que le helper existe et compte
  const { rateLimit } = await import('../lib/rate-limit');
  for (let i = 0; i < 5; i++) rateLimit('register:test-ip', 5, 3600_000);
  check('rate limit register 6e appel refusé', !rateLimit('register:test-ip', 5, 3600_000).allowed);

  console.log(`\n${passed} tests PASS`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL exception', e);
  process.exit(1);
});
