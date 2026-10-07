#!/usr/bin/env bash
# =============================================================================
# Installation automatique de Meal Plan (branche beta) sur Proxmox
# =============================================================================
# CE SCRIPT S'EXECUTE SUR L'HOTE PROXMOX (shell root), pas dans un conteneur.
#
# Il cree un conteneur LXC Debian 12 dedie, y installe Node.js, deploye la
# branche beta de l'application, la configure (secret de session genere,
# fuseau Europe/Paris, acces par IP), cree la base et le compte admin,
# compile, et lance l'application sous PM2 (relancee au reboot).
#
# Usage :
#   bash proxmox-install.sh <CTID> <ADMIN_EMAIL> [ADMIN_PASSWORD] [seed]
#
#   CTID           : identifiant du conteneur a creer (ex. 120)
#   ADMIN_EMAIL    : email du compte administrateur
#   ADMIN_PASSWORD : mot de passe admin (si absent : genere et affiche)
#   seed           : "yes" pour charger les 45 recettes de demo (defaut: no)
#
# Variables d'environnement optionnelles (a definir avant d'appeler le script) :
#   BRIDGE   : pont reseau Proxmox (defaut: vmbr0)
#   ROOTFS   : stockage disque du conteneur (defaut: local-lvm:5  => 5 Go)
#
# Exemple :
#   bash proxmox-install.sh 120 famille@exemple.fr MonMotDePasse yes
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Parametres
# ---------------------------------------------------------------------------
CTID="${1:-}"
ADMIN_EMAIL="${2:-}"
ADMIN_PASSWORD="${3:-}"
SEED="${4:-no}"

BRIDGE="${BRIDGE:-vmbr0}"
ROOTFS="${ROOTFS:-local-lvm:5}"
TZ="${TZ:-Europe/Paris}"
PORT="${PORT:-3000}"
CT_HOSTNAME="meal-plan"
APP_DIR="/opt/meal_plan"
REPO_URL="https://github.com/Leviath42/meal_plan.git"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
step() { printf '\n\033[1;36m== %s\033[0m\n' "$1"; }
die()  { printf '\033[1;31mERREUR: %s\033[0m\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Verifications prealables
# ---------------------------------------------------------------------------
bold "Installation de Meal Plan (beta) sur Proxmox"

[ "$(id -u)" -eq 0 ] || die "Ce script doit etre lance en root sur l'hote Proxmox."
command -v pct >/dev/null 2>&1 || die "Commande 'pct' introuvable : ce script doit etre execute sur l'hote Proxmox, pas dans un conteneur."
[ -n "$CTID" ] || die "Usage: bash proxmox-install.sh <CTID> <ADMIN_EMAIL> [ADMIN_PASSWORD] [seed]
Exemple: bash proxmox-install.sh 120 famille@exemple.fr MonMotDePasse yes"
[[ "$CTID" =~ ^[0-9]+$ ]] || die "Le CTID doit etre un nombre (ex. 120)."
[ -n "$ADMIN_EMAIL" ] || die "Indique l'email du compte administrateur (2e argument)."

pct status "$CTID" >/dev/null 2>&1 && die "Le conteneur $CTID existe deja. Choisis un autre CTID ou supprime-le d'abord (pct destroy $CTID)."

if [ -z "$ADMIN_PASSWORD" ]; then
  ADMIN_PASSWORD="$(openssl rand -base64 12)"
  printf '(mot de passe admin non fourni : un mot de passe aleatoire sera genere et affiche a la fin)\n'
fi

# ---------------------------------------------------------------------------
# Template Debian 12 : detection du stockage et telechargement si besoin
# ---------------------------------------------------------------------------
step "1/7 Preparation du template Debian 12"

pveam update >/dev/null 2>&1 || true

STORAGE="$(pveam status 2>/dev/null | awk 'NR>1 && NF>=3 {print $1; exit}')"
[ -n "$STORAGE" ] || die "Aucun stockage de templates LXC (vztmpl) trouve via 'pveam status'."

TPL_FILE="$(pveam list "$STORAGE" 2>/dev/null | awk '/debian-12/ {print $2}' | tail -1)"
if [ -z "$TPL_FILE" ]; then
  printf "Telechargement du template Debian 12 dans %s...\n" "$STORAGE"
  TPL_NAME="$(pveam available 2>/dev/null | awk '/debian-12-standard/ {print $2}' | sort | tail -1)"
  [ -n "$TPL_NAME" ] || die "Template Debian 12 introuvable dans 'pveam available'."
  pveam download "$STORAGE" "$TPL_NAME"
  TPL_FILE="$(pveam list "$STORAGE" 2>/dev/null | awk '/debian-12/ {print $2}' | tail -1)"
fi
[ -n "$TPL_FILE" ] || die "Impossible d'obtenir le template Debian 12."

CT_PASSWORD="$(openssl rand -base64 12)"

# ---------------------------------------------------------------------------
# Creation du conteneur
# ---------------------------------------------------------------------------
step "2/7 Creation du conteneur $CTID ($CT_HOSTNAME)"

pct create "$CTID" "${STORAGE}:vztmpl/${TPL_FILE}" \
  --hostname "$CT_HOSTNAME" \
  --unprivileged 1 \
  --cores 1 \
  --memory 1024 \
  --swap 512 \
  --rootfs "$ROOTFS" \
  --net0 "name=eth0,bridge=${BRIDGE},ip=dhcp" \
  --timezone "$TZ" \
  --password "$CT_PASSWORD" \
  --start 1

printf "Conteneur cree et demarre. Attente du reseau (DHCP)...\n"
NET_OK=0
for _ in $(seq 1 30); do
  if pct exec "$CTID" -- ping -c 1 -W 2 1.1.1.1 >/dev/null 2>&1; then NET_OK=1; break; fi
  sleep 2
done
[ "$NET_OK" -eq 1 ] || die "Le conteneur n'obtient pas d'acces reseau (DHCP). Verifie le pont '$BRIDGE' (variable BRIDGE pour en changer) : ip link show $BRIDGE"
printf "Reseau OK.\n"

# ---------------------------------------------------------------------------
# Script d'installation execute A L'INTERIEUR du conteneur
# ---------------------------------------------------------------------------
step "3/7 Ecriture du script d'installation du conteneur"

INNER="$(mktemp)"
cat > "$INNER" <<'EOF'
#!/usr/bin/env bash
# Installation de Meal Plan dans le conteneur (execute par pct exec).
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_DIR="/opt/meal_plan"

echo "[1/6] Outils de base..."
apt-get update -qq
apt-get install -y -qq curl git build-essential python3 openssl ca-certificates

echo "[2/6] Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
apt-get install -y -qq nodejs
node -v

echo "[3/6] Code de la branche beta..."
rm -rf "$APP_DIR"
git clone -b beta --depth 1 https://github.com/Leviath42/meal_plan.git "$APP_DIR"
cd "$APP_DIR"

echo "[4/6] Dependances (peut prendre plusieurs minutes, modules natifs a compiler)..."
npm ci --no-audit --no-fund

echo "[5/6] Configuration + base de donnees..."
if [ ! -f .env.local ]; then
  AUTH_SECRET="$(openssl rand -base64 32)"
  cat > .env.local <<ENVEOF
AUTH_SECRET=$AUTH_SECRET
AUTH_TRUST_HOST=true
TZ=${TZ}
PORT=${PORT}
ENVEOF
  echo "Fichier .env.local cree (secret genere automatiquement)."
fi
npm run db:migrate

if [ "${SEED:-no}" = "yes" ]; then
  echo "Chargement des donnees de demonstration..."
  npm run seed
fi

if [ -n "${ADMIN_EMAIL:-}" ]; then
  echo "Creation du compte administrateur..."
  npm run create-admin -- "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
fi

echo "[6/6] Build + PM2..."
npm run build
npm install -g pm2 --silent
pm2 start npm --name meal-plan -- start
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# Script de mise a jour pour la beta (a relancer a chaque nouvelle version)
cat > "$APP_DIR/update.sh" <<'UPDATEEOF'
#!/usr/bin/env bash
# Mise a jour de la branche beta : bash /opt/meal_plan/update.sh
set -e
cd /opt/meal_plan
pm2 stop meal-plan || true
git pull origin beta
npm ci --no-audit --no-fund
npm run db:migrate
npm run build
pm2 start meal-plan || pm2 start npm --name meal-plan -- start
pm2 save
echo "Mise a jour terminee."
UPDATEEOF
chmod +x "$APP_DIR/update.sh"

echo "Installation terminee dans le conteneur."
EOF

pct push "$CTID" "$INNER" /root/install-app.sh --perms 755
rm -f "$INNER"

# ---------------------------------------------------------------------------
# Execution de l'installation dans le conteneur
# ---------------------------------------------------------------------------
step "4/7 Installation dans le conteneur (Node, code, dependances...)"

pct exec "$CTID" -- env \
  ADMIN_EMAIL="$ADMIN_EMAIL" \
  ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  SEED="$SEED" \
  TZ="$TZ" \
  PORT="$PORT" \
  bash /root/install-app.sh

# ---------------------------------------------------------------------------
# Resultat
# ---------------------------------------------------------------------------
step "5/7 Etat du service"
pct exec "$CTID" -- pm2 status

step "6/7 Adresse d'acces"
IP="$(pct exec "$CTID" -- hostname -I | awk '{print $1}')"

step "7/7 Termine"

printf '\n'
bold "====================================================================="
printf "Meal Plan (beta) est installe dans le conteneur %s.\n\n" "$CTID"
printf "  URL           : http://%s:%s\n" "${IP:-IP_DU_CONTENEUR}" "$PORT"
printf "  Compte admin  : %s\n" "$ADMIN_EMAIL"
printf "  Mot de passe  : %s\n" "$ADMIN_PASSWORD"
printf "  Mdp root CT   : %s\n" "$CT_PASSWORD"
printf "  Maj beta      : pct exec %s -- bash /opt/meal_plan/update.sh\n" "$CTID"
printf "  Logs          : pct exec %s -- pm2 logs meal-plan\n" "$CTID"
bold "====================================================================="
printf "Ouvre http://%s:%s depuis un telephone du meme reseau.\n" "${IP:-IP_DU_CONTENEUR}" "$PORT"
printf "Conserve le mot de passe admin, puis change-le depuis la page Profil.\n"
