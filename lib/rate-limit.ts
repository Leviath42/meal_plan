// lib/rate-limit.ts
// Limitation de tentatives en mémoire — suffisant pour une instance familiale
// mono-processus (pm2 fork, un seul serveur Node). Pour un déploiement
// multi-instances, passer à un stockage partagé (Redis ou table dédiée).
//
// Usage : const { allowed, retryAfterSec } = rateLimit(`reset:${email}`, 5, 60_000);

const buckets = new Map<string, number[]>();

// Purge périodique des cliers expirées pour borner la mémoire
function pruneExpired(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, timestamps] of buckets) {
    if (timestamps.every((t) => now - t > 24 * 60 * 60 * 1000)) {
      buckets.delete(key);
    }
  }
}

export function rateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  pruneExpired(now);

  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxAttempts) {
    buckets.set(key, timestamps);
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - timestamps[0])) / 1000));
    return { allowed: false, retryAfterSec };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, retryAfterSec: 0 };
}
