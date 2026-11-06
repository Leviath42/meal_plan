import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Test runtime F15 — retours clients : envoi valide (statut/page_url/app_version),
// validation Zod refusée (message vide, catégorie hors enum, >1000 caractères),
// rate limit atteint (6e envoi refusé), statut changé en base côté admin.
// Le test exécute les MÊMES fonctions que la production (lib/validators/feedback)
// — jamais une réplique divergente (leçon C-055).

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mealplan-fb-'));
const dbPath = path.join(tmpDir, 'feedback.db');
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
  // Base jetable + réconciliation idempotente (pattern des scripts existants)
  execFileSync('npx', ['tsx', 'scripts/db-ensure.ts', path.join(process.cwd(), 'drizzle'), dbPath], { stdio: 'inherit', shell: process.platform === 'win32' });

  const { db } = await import('../lib/db');
  const { users, feedback } = await import('../lib/db/schema');
  const { eq } = await import('drizzle-orm');
  const Argon2 = (await import('@node-rs/argon2')).default;
  const {
    feedbackInput,
    feedbackStatusInput,
    checkFeedbackRateLimit,
    createFeedback,
    updateFeedbackStatus,
    FEEDBACK_MAX_PER_HOUR,
  } = await import('../lib/validators/feedback');

  const hash = await Argon2.hash('x');
  const [author] = await db
    .insert(users)
    .values({ email: 'fb@test.local', name: 'Auteur', password: hash, role: 'MEMBER' })
    .returning();
  check('utilisateur auteur créé', !!author?.id);

  // --- 1. Envoi valide ---
  const valid = feedbackInput.safeParse({ category: 'bug', message: '  Le calendrier se vide au survol  ' });
  check('envoi valide accepté (message trimé)', valid.success && valid.data.message === 'Le calendrier se vide au survol');

  const row = await createFeedback({
    userId: author.id,
    category: valid.data.category,
    message: valid.data.message,
    pageUrl: 'https://mealplan.example/calendar?month=2026-11',
    appVersion: '0.1.0',
  });
  check('retour enregistré', !!row?.id);

  const [inDb] = await db.select().from(feedback).where(eq(feedback.id, row.id));
  check('statut défaut « nouveau »', inDb.status === 'nouveau');
  check('page_url capturée côté serveur', inDb.pageUrl === 'https://mealplan.example/calendar?month=2026-11');
  check('app_version capturée côté serveur', inDb.appVersion === '0.1.0');
  check('catégorie et message en base', inDb.category === 'bug' && inDb.message === 'Le calendrier se vide au survol');

  // --- 2. Validation refusée (Zod) ---
  check('message vide refusé', !feedbackInput.safeParse({ category: 'bug', message: '' }).success);
  check('message blanc refusé (trim)', !feedbackInput.safeParse({ category: 'bug', message: '   ' }).success);
  check('catégorie hors enum refusée', !feedbackInput.safeParse({ category: 'menu', message: 'x' }).success);
  check('message > 1000 caractères refusé', !feedbackInput.safeParse({ category: 'idee', message: 'a'.repeat(1001) }).success);
  check('message de 1000 caractères accepté', feedbackInput.safeParse({ category: 'idee', message: 'a'.repeat(1000) }).success);

  // --- 3. Rate limit : 5/h puis refus propre ---
  const [rlUser] = await db
    .insert(users)
    .values({ email: 'rl@test.local', name: 'Bavard', password: hash, role: 'MEMBER' })
    .returning();
  let allAllowed = true;
  for (let i = 0; i < FEEDBACK_MAX_PER_HOUR; i++) {
    const { allowed } = checkFeedbackRateLimit(rlUser.id);
    allAllowed = allAllowed && allowed;
  }
  check('5 premiers envois autorisés', allAllowed);
  const sixth = checkFeedbackRateLimit(rlUser.id);
  check('6e envoi refusé proprement', sixth.allowed === false);
  check('délai de rejeu renvoyé (> 0 s)', sixth.retryAfterSec > 0);

  // Un autre utilisateur n'est pas affecté par le quota du précédent
  check('quota indépendant par utilisateur', checkFeedbackRateLimit(author.id).allowed === true);

  // --- 4. Changement de statut (admin) ---
  const statusOk = feedbackStatusInput.safeParse({ id: row.id, status: 'trie' });
  check('statut admin valide accepté', statusOk.success);
  check('mise à jour « trie » effectuée', await updateFeedbackStatus(statusOk.data.id, statusOk.data.status) === true);
  const [tri] = await db.select().from(feedback).where(eq(feedback.id, row.id));
  check('statut « trie » en base', tri.status === 'trie');

  check('mise à jour « traite » effectuée', await updateFeedbackStatus(row.id, 'traite') === true);
  const [tra] = await db.select().from(feedback).where(eq(feedback.id, row.id));
  check('statut « traite » en base', tra.status === 'traite');

  check('statut hors enum refusé (Zod)', !feedbackStatusInput.safeParse({ id: row.id, status: 'termine' }).success);
  check('identifiant manquant refusé (Zod)', !feedbackStatusInput.safeParse({ id: '', status: 'rejete' }).success);
  check('identifiant inconnu -> false, rien écrit', (await updateFeedbackStatus('id-inexistant', 'rejete')) === false);

  // Meilleur effort : sous Windows la base jetable peut encore être ouverte par
  // better-sqlite3 au moment du nettoyage (EPERM) — pas bloquant, dossier temp
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
  console.log(`\n${passed} tests PASS`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL exception', e);
  process.exit(1);
});
