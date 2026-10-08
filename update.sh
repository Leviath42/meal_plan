#!/usr/bin/env bash
# update.sh — mise à jour robuste de meal_plan sur le CT Proxmox.
#
# Usage :
#   bash /opt/meal_plan/update.sh            # mise à jour depuis origin/beta
#   bash /opt/meal_plan/update.sh rollback   # restaure la dernière sauvegarde de la base
#
# Ordre des opérations (chaque étape s'arrête net en cas d'échec) :
#   1. stop de l'app (la base ne doit pas être écrite pendant l'échange de fichier)
#   2. sauvegarde horodatée de data/sqlite.db (10 dernières conservées)
#   3. git fetch + reset --hard origin/beta (la base du dépôt écrase la prod,
#      c'est voulu : elle est restaurée à l'étape suivante)
#   4. restauration de la base de production
#   5. npm ci (uniquement si package-lock.json a changé)
#   6. npm run db:ensure  — réconciliation idempotente du schéma (crée ce qui
#      manque, réaligne __drizzle_migrations) : converge TOUTE base vers le schéma
#      courant, même une sauvegarde ancienne
#   7. npm run db:migrate  — no-op normal, applique les nouvelles migrations
#   8. npm run build
#   9. relance pm2 + healthcheck HTTP

set -euo pipefail

APP_DIR="/opt/meal_plan"
PM2_NAME="meal-plan"
BRANCH="beta"
PORT="${PORT:-3000}"
BACKUP_DIR="$APP_DIR/data/backups"
KEEP_BACKUPS=10

cd "$APP_DIR"

log() { printf '[update] %s\n' "$*"; }
die() {
  printf '[update] ERREUR : %s\n' "$*" >&2
  # Filet de sécurité : ne jamais laisser l'application arrêtée derrière une
  # erreur. Le redémarrage peut échouer si le build est cassé (le pm2 crashera
  # dessus), mais on tente : si le .next précédent est intact, le site revient.
  printf "[update] tentative de relance de l'application...\n" >&2
  pm2 restart "$PM2_NAME" >/dev/null 2>&1 \
    || pm2 start npm --name "$PM2_NAME" -- start >/dev/null 2>&1 \
    || true
  pm2 save >/dev/null 2>&1 || true
  exit 1
}

# ---------------------------------------------------------------------------
# Mode rollback : restaurer la dernière sauvegarde de la base
# ---------------------------------------------------------------------------
if [ "${1:-}" = "rollback" ]; then
  log "mode rollback"
  LATEST=$(ls -1t "$BACKUP_DIR"/db-*.db 2>/dev/null | head -1 || true)
  [ -n "$LATEST" ] || die "aucune sauvegarde dans $BACKUP_DIR"
  pm2 stop "$PM2_NAME" 2>/dev/null || true
  cp "$LATEST" data/sqlite.db
  npm run db:ensure || die "db:ensure a échoué après restauration"
  pm2 restart "$PM2_NAME" --update-env 2>/dev/null \
    || pm2 start npm --name "$PM2_NAME" -- start
  pm2 save
  log "base restaurée : $LATEST"
  exit 0
fi

# ---------------------------------------------------------------------------
# Mise à jour
# ---------------------------------------------------------------------------
BEFORE=$(git rev-parse --short HEAD)

log "arrêt de l'application"
pm2 stop "$PM2_NAME" 2>/dev/null || log "process pm2 absent, on continue"

log "sauvegarde de la base"
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
cp data/sqlite.db "$BACKUP_DIR/db-$STAMP.db"
ls -1t "$BACKUP_DIR"/db-*.db | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm --

log "récupération du code ($BEFORE -> ?)"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
AFTER=$(git rev-parse --short HEAD)

log "restauration de la base de production"
cp "$BACKUP_DIR/db-$STAMP.db" data/sqlite.db

if ! git diff --quiet "$BEFORE" "$AFTER" -- package-lock.json; then
  log "package-lock.json a changé : npm ci"
  npm ci || die "npm ci a échoué"
fi

log "réconciliation du schéma de la base"
npm run db:ensure || die "db:ensure a échoué"

log "migrations"
npm run db:migrate || die "db:migrate a échoué"

log "build"
npm run build || die "build a échoué"

log "relance de l'application"
pm2 restart "$PM2_NAME" --update-env 2>/dev/null \
  || pm2 start npm --name "$PM2_NAME" -- start
pm2 save

log "healthcheck (démarrage de Next.js : quelques secondes)"
CODE=000
for _ in 1 2 3 4 5 6 7 8 9 10; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" || true)
  [ -n "$CODE" ] && [ "$CODE" != "000" ] && break
  sleep 3
done

if [ -z "$CODE" ] || [ "$CODE" = "000" ]; then
  die "l'application ne répond pas sur le port $PORT (logs : pm2 logs $PM2_NAME). Retour arrière : bash update.sh rollback"
fi

# Un code d'erreur (500, 403…) n'est PAS un démarrage réussi : la mise à jour
# ne doit pas être annoncée terminée sur un serveur qui plante.
case "$CODE" in
  [23]??) ;;
  *)
    die "healthcheck : HTTP $CODE (le serveur répond mais en erreur). Logs : pm2 logs $PM2_NAME. Retour arrière : bash update.sh rollback"
    ;;
esac

log "healthcheck : HTTP $CODE"
log "mise à jour $BEFORE -> $AFTER terminée"
