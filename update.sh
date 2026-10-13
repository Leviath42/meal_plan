#!/usr/bin/env bash
# update.sh — mise à jour robuste de meal_plan sur le CT Proxmox.
#
# Usage :
#   bash /opt/meal_plan/update.sh            # mise à jour depuis origin/beta
#   bash /opt/meal_plan/update.sh rollback   # restaure la dernière sauvegarde de la base
#
# Ordre des opérations (chaque étape s'arrête net en cas d'échec) :
#   1. fetch du code AVANT l'arrêt de l'app : un échec réseau (DNS down,
#      coupure) n'interrompt pas une seconde le service (C-036). Contournement
#      DNS automatique via scripts/resolve-host.cjs si github.com ne résout pas.
#   2. stop de l'app (la base ne doit pas être écrite pendant l'échange de fichier)
#   3. sauvegarde horodatée de data/sqlite.db (10 dernières conservées)
#   4. git reset --hard origin/beta (la base du dépôt écrase la prod,
#      c'est voulu : elle est restaurée à l'étape suivante)
#   5. restauration de la base de production
#   6. npm ci (uniquement si package-lock.json a changé)
#   7. npm run db:ensure  — réconciliation idempotente du schéma (crée ce qui
#      manque, réaligne __drizzle_migrations) : converge TOUTE base vers le schéma
#      courant, même une sauvegarde ancienne
#   8. npm run db:migrate  — no-op normal, applique les nouvelles migrations
#   9. npm run build
#  10. relance pm2 + healthcheck HTTP

set -euo pipefail

APP_DIR="/opt/meal_plan"
PM2_NAME="meal-plan"
# Branche suivie par ce serveur : override ponctuel via l'environnement
# (ex. BRANCH=main bash update.sh), sinon fichier .deploy-branch déposé à
# l'installation (scripts/proxmox-install.sh écrit la branche installée),
# sinon beta par défaut (conteneur de test).
BRANCH="${BRANCH:-$(cat "$APP_DIR/.deploy-branch" 2>/dev/null || true)}"
BRANCH="${BRANCH:-beta}"
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

# Contournement DNS (C-036) : le resolver du CT est la box (DHCP, pannes
# récurrentes). Si github.com ne résout pas, on le résout via un DNS public
# en IP directe (1.1.1.1 / 8.8.8.8, UDP sans resolver système) avec Node —
# présent sur le CT pour l'app — et on l'écris dans /etc/hosts pour la
# session. Silencieux et sans effet si le DNS fonctionne.
ensure_github_dns() {
  if getent hosts github.com >/dev/null 2>&1; then
    return 0
  fi
  log "DNS cassé (github.com irrésolvable) — contournement via DNS public"
  local ip
  ip=$(node "$APP_DIR/scripts/resolve-host.cjs" github.com 2>/dev/null || true)
  if [ -n "$ip" ]; then
    # Retirer une éventuelle entrée périmée puis écrire l'IP fraîche
    sed -i '/[[:space:]]github\.com$/d' /etc/hosts 2>/dev/null || true
    echo "$ip github.com" >> /etc/hosts
    log "contournement DNS : github.com -> $ip écrit dans /etc/hosts"
  else
    log "contournement DNS impossible (DNS publics injoignables ?)"
  fi
}

# ---------------------------------------------------------------------------
# Mode rollback : restaurer la dernière sauvegarde de la base
# ---------------------------------------------------------------------------
if [ "${1:-}" = "rollback" ]; then
  log "mode rollback"
  LATEST=$(ls -1t "$BACKUP_DIR"/db-*.db 2>/dev/null | head -1 || true)
  [ -n "$LATEST" ] || die "aucune sauvegarde dans $BACKUP_DIR"
  pm2 stop "$PM2_NAME" 2>/dev/null || true
  rm -f data/sqlite.db-wal data/sqlite.db-shm
  cp "$LATEST" data/sqlite.db
  STAMP2=$(basename "$LATEST" .db)
  [ -f "$BACKUP_DIR/$STAMP2.db-wal" ] && cp "$BACKUP_DIR/$STAMP2.db-wal" data/sqlite.db-wal || true
  [ -f "$BACKUP_DIR/$STAMP2.db-shm" ] && cp "$BACKUP_DIR/$STAMP2.db-shm" data/sqlite.db-shm || true
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

# Récupération du code AVANT l'arrêt de l'app (C-036) : le fetch est la seule
# étape réseau de la mise à jour — s'il échoue (DNS, coupure), l'application
# n'a pas été arrêtée une seconde et continue de servir les requêtes.
ensure_github_dns
log "récupération du code ($BEFORE -> ?)"
git fetch origin "$BRANCH" \
  || die "git fetch a échoué (réseau/DNS ?) — l'application n'a PAS été arrêtée, elle continue de tourner"

log "arrêt de l'application"
pm2 stop "$PM2_NAME" 2>/dev/null || log "process pm2 absent, on continue"

log "sauvegarde de la base (WAL : copie des fichiers annexes s'ils existent)"
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
# L'app est arrêtée : la base est stable, mais en mode WAL les dernières
# écritures peuvent vivre dans sqlite.db-wal — sauvegarder l'ensemble.
cp data/sqlite.db "$BACKUP_DIR/db-$STAMP.db"
[ -f data/sqlite.db-wal ] && cp data/sqlite.db-wal "$BACKUP_DIR/db-$STAMP.db-wal" || true
[ -f data/sqlite.db-shm ] && cp data/sqlite.db-shm "$BACKUP_DIR/db-$STAMP.db-shm" || true
chmod 600 "$BACKUP_DIR"/db-$STAMP.db*
ls -1t "$BACKUP_DIR"/db-*.db | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm --

# Le fetch a déjà eu lieu avant l'arrêt de l'app (C-036) : il ne reste que
# la bascule du working tree, qui doit échouer via die() (relance de l'app).
git reset --hard "origin/$BRANCH" || die "git reset a échoué — l'app est relancée sur le code actuel"
AFTER=$(git rev-parse --short HEAD)

log "restauration de la base de production"
# Supprimer d'éventuels fichiers WAL résiduels : un -wal orphelin d'une autre
# base serait REJOUÉ par SQLite sur la base restaurée (corruption).
rm -f data/sqlite.db-wal data/sqlite.db-shm
cp "$BACKUP_DIR/db-$STAMP.db" data/sqlite.db
[ -f "$BACKUP_DIR/db-$STAMP.db-wal" ] && cp "$BACKUP_DIR/db-$STAMP.db-wal" data/sqlite.db-wal || true
[ -f "$BACKUP_DIR/db-$STAMP.db-shm" ] && cp "$BACKUP_DIR/db-$STAMP.db-shm" data/sqlite.db-shm || true

if ! git diff --quiet "$BEFORE" "$AFTER" -- package-lock.json; then
  log "package-lock.json a changé : npm ci (devDependencies incluses)"
  # npm ci hérite de NODE_ENV du process appelant : déclenchée depuis
  # l'application, la mise à jour tourne avec NODE_ENV=production et
  # npm ci omet les devDependencies (tsx, drizzle-kit) → db:ensure
  # échoue ensuite. Forcer l'installation complète (C-030).
  NODE_ENV=development npm ci || die "npm ci a échoué"
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
