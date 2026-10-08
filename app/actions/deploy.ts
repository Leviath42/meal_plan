'use server';

// app/actions/deploy.ts
// Déclenchement du déploiement beta depuis l'application (page /deploy),
// pour mettre à jour ou annuler la version sans se connecter au Proxmox.
//
// Sécurité : seul un ADMIN (rôle revalidé en base via requireAdmin) peut
// déclencher. Les commandes sont figées (« update.sh » / « update.sh
// rollback ») : aucun argument utilisateur n'atteint le shell.
//
// Fonctionnement : le script tourne dans un processus détaché qui survit au
// redémarrage de l'application (pm2 relance le serveur pendant le build).
// Son état vit dans data/ :
//   - deploy-status.json : { mode, startedAt, pid } du dernier déclenchement
//   - deploy.log         : sortie complète du script
//   - deploy-exit.code   : code retour écrit à la fin du script

import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { auth } from '@/lib/auth';
import { requireAdmin } from '@/lib/auth-guards';

export interface CommitSummary {
  hash: string;
  subject: string;
  author: string;
  date: string;
}

export interface DeployStatus {
  isAdmin: boolean;
  currentCommit: string | null;
  commitSubject: string | null;
  commitBody: string | null;
  commitAuthor: string | null;
  commitDate: string | null;
  recentCommits: CommitSummary[];
  buildId: string | null;
  running: boolean;
  mode: 'update' | 'rollback' | null;
  startedAt: string | null;
  exitCode: number | null;
  finishedAt: string | null;
  logTail: string | null;
}

export interface TriggerResult {
  success: boolean;
  message: string;
}

interface StatusFile {
  mode: 'update' | 'rollback';
  startedAt: string;
  pid: number;
}

function dataPath(name: string): string {
  return path.join(process.cwd(), 'data', name);
}

function readStatusFile(): StatusFile | null {
  try {
    return JSON.parse(readFileSync(dataPath('deploy-status.json'), 'utf8'));
  } catch {
    return null;
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM : le processus existe mais appartient à un autre utilisateur
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function tail(file: string, lines: number): string | null {
  try {
    const content = readFileSync(file, 'utf8').trimEnd();
    if (!content) return null;
    return content.split('\n').slice(-lines).join('\n');
  } catch {
    return null;
  }
}

function readExitCode(): number | null {
  try {
    const raw = readFileSync(dataPath('deploy-exit.code'), 'utf8').trim();
    const code = parseInt(raw, 10);
    return Number.isNaN(code) ? null : code;
  } catch {
    return null;
  }
}

// Détail du commit HEAD : sujet, message complet, auteur, date.
function readHeadDetail(): {
  subject: string | null;
  body: string | null;
  author: string | null;
  date: string | null;
} {
  try {
    const out = execSync(
      'git show -s --format=%s%x1f%b%x1f%an%x1f%aI HEAD',
      { cwd: process.cwd(), encoding: 'utf8' },
    ).trim();
    const [subject, body, author, date] = out.split('\x1f');
    return {
      subject: subject?.trim() || null,
      body: body?.trim() || null,
      author: author?.trim() || null,
      date: date?.trim() || null,
    };
  } catch {
    return { subject: null, body: null, author: null, date: null };
  }
}

// Derniers commits (du plus récent au plus ancien) pour se repérer
function readRecentCommits(count: number): CommitSummary[] {
  try {
    const out = execSync(
      `git log -${count} --format=%h%x1f%s%x1f%an%x1f%aI`,
      { cwd: process.cwd(), encoding: 'utf8' },
    ).trim();
    if (!out) return [];
    return out.split('\n').map((line) => {
      const [hash, subject, author, date] = line.split('\x1f');
      return {
        hash: hash?.trim() ?? '',
        subject: subject?.trim() ?? '',
        author: author?.trim() ?? '',
        date: date?.trim() ?? '',
      };
    });
  } catch {
    return [];
  }
}

// État du déploiement : version chargée, exécution en cours, dernier journal.
// Accessible à tout utilisateur connecté (la version n'est pas sensible) ;
// les commandes, elles, restent réservées à l'ADMIN.
export async function getDeployStatus(): Promise<DeployStatus> {
  const session = await auth();

  let currentCommit: string | null = null;
  try {
    currentCommit = execSync('git rev-parse --short HEAD', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
  } catch {
    currentCommit = null;
  }

  let buildId: string | null = null;
  try {
    buildId = readFileSync(path.join(process.cwd(), '.next', 'BUILD_ID'), 'utf8').trim();
  } catch {
    buildId = null;
  }

  const statusFile = readStatusFile();
  const exitCode = readExitCode();
  const running = statusFile ? pidAlive(statusFile.pid) && exitCode === null : false;

  const headDetail = readHeadDetail();
  const recentCommits = readRecentCommits(5);

  let finishedAt: string | null = null;
  if (statusFile && !running && exitCode !== null) {
    try {
      const stat = statSync(dataPath('deploy-exit.code'));
      finishedAt = stat.mtime.toISOString();
    } catch {
      finishedAt = null;
    }
  }

  return {
    isAdmin: session?.user?.role === 'ADMIN',
    currentCommit,
    commitSubject: headDetail.subject,
    commitBody: headDetail.body,
    commitAuthor: headDetail.author,
    commitDate: headDetail.date,
    recentCommits,
    buildId,
    running,
    mode: statusFile?.mode ?? null,
    startedAt: statusFile?.startedAt ?? null,
    exitCode,
    finishedAt,
    logTail: tail(dataPath('deploy.log'), 60),
  };
}

// Déclenche update.sh (mode 'update') ou update.sh rollback (mode 'rollback').
export async function triggerDeploy(mode: 'update' | 'rollback'): Promise<TriggerResult> {
  try {
    await requireAdmin();
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Action refusée' };
  }

  if (mode !== 'update' && mode !== 'rollback') {
    return { success: false, message: 'Mode de déploiement inconnu' };
  }

  const previous = readStatusFile();
  if (previous && pidAlive(previous.pid) && readExitCode() === null) {
    return { success: false, message: 'Un déploiement est déjà en cours' };
  }

  if (!existsSync(path.join(process.cwd(), 'update.sh'))) {
    return {
      success: false,
      message: 'update.sh est introuvable sur ce serveur (déploiement possible uniquement sur le CT)',
    };
  }

  try {
    // Nettoyer l'état de la précédente exécution
    rmSync(dataPath('deploy-exit.code'), { force: true });

    const scriptArg = mode === 'rollback' ? ' rollback' : '';
    const command = `bash update.sh${scriptArg} > data/deploy.log 2>&1; echo $? > data/deploy-exit.code`;
    const child = spawn('bash', ['-c', command], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    writeFileSync(
      dataPath('deploy-status.json'),
      JSON.stringify({ mode, startedAt: new Date().toISOString(), pid: child.pid }),
    );

    return {
      success: true,
      message:
        mode === 'update'
          ? 'Mise à jour lancée : le serveur va redémarrer pendant le build'
          : 'Retour arrière lancé : la dernière sauvegarde de la base est restaurée',
    };
  } catch (error) {
    return {
      success: false,
      message: `Échec du lancement : ${error instanceof Error ? error.message : 'erreur inconnue'}`,
    };
  }
}
