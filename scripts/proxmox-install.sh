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
#   BRIDGE : pont reseau Proxmox (defaut : auto-detecte)
#   ROOTFS : stockage disque du conteneur (defaut : auto-detecte, 5 Go)
#
# Exemple :
#   bash proxmox-install.sh 120 famille@exemple.fr MonMotDePasse yes
# =============================================================================

SCRIPT_VERSION="v5"

set -eu
# En cas d'echec : afficher la commande fautive avant de sortir (jamais d'arret muet)
trap 'printf "\nERREUR ligne %s : %s\n" "$LINENO" "$BASH_COMMAND" >&2' ERR

# ---------------------------------------------------------------------------
# Parametres
# ---------------------------------------------------------------------------
CTID="${1:-}"
ADMIN_EMAIL="${2:-}"
ADMIN_PASSWORD="${3:-}"
SEED="${4:-no}"

BRIDGE="${BRIDGE:-}"
ROOTFS="${ROOTFS:-}"
TZ="${TZ:-Europe/Paris}"
PORT="${PORT:-3000}"
APP_DIR="/opt/meal_plan"
REPO_URL="https://github.com/Leviath42/meal_plan.git"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
step() { printf '\n\033[1;36m== %s\033[0m\n' "$1"; }
die()  { printf '\033[1;31mERREUR: %s\033[0m\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Verifications prealables
# ---------------------------------------------------------------------------
bold "Installation de Meal Plan (beta) sur Proxmox"
printf "Version du script : %s (toute erreur affiche un message ERREUR ligne N)\n" "$SCRIPT_VERSION"

[ "$(id -u)" -eq 0 ] || die "Ce script doit etre lance en root sur l'hote Proxmox."
command -v pct >/dev/null 2>&1 || die "Commande 'pct' introuvable : ce script doit etre execute sur l'hote Proxmox, pas dans un conteneur."
command -v pvesm >/dev/null 2>&1 || die "Commande 'pvesm' introuvable : ce script doit etre execute sur l'hote Proxmox."
[ -n "$CTID" ] || die "Usage: bash proxmox-install.sh <CTID> <ADMIN_EMAIL> [ADMIN_PASSWORD] [seed]
Exemple: bash proxmox-install.sh 120 famille@exemple.fr MonMotDePasse yes"
case "$CTID" in *[!0-9]*) die "Le CTID doit etre un nombre (ex. 120).";; esac
[ -n "$ADMIN_EMAIL" ] || die "Indique l'email du compte administrateur (2e argument)."

if pct status "$CTID" >/dev/null 2>&1; then
  die "Le conteneur $CTID existe deja. Choisis un autre CTID ou supprime-le d'abord (pct destroy $CTID)."
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  ADMIN_PASSWORD="$(openssl rand -base64 12)"
  printf '(mot de passe admin non fourni : un mot de passe aleatoire sera genere et affiche a la fin)\n'
fi

# Pont reseau : auto-detection si non fourni
if [ -z "$BRIDGE" ]; then
  BRIDGE="$(ip -o link show type bridge 2>/dev/null | awk -F': ' '{print $2}' | head -n1)"
fi
[ -n "$BRIDGE" ] || die "Aucun pont reseau detecte. Relance avec BRIDGE=<ton pont> (ex. BRIDGE=vmbr0)."

# ---------------------------------------------------------------------------
# Template Debian 12 : detection du stockage et telechargement si besoin
# ---------------------------------------------------------------------------
step "1/7 Preparation du template Debian 12"

pveam update >/dev/null 2>&1 || true

# Stockage de templates : les stockages dont le contenu inclut vztmpl
STORAGE="$(pvesm status --content vztmpl 2>/dev/null | awk 'NR>1 && NF>=3 {print $1}' | head -n1)"
[ -n "$STORAGE" ] || die "Aucun stockage avec le contenu 'CT templates' (vztmpl). Datacenter > Storage > Edit : ajoute 'CT templates' au contenu d'un stockage, puis relance."
printf 'Stockage de templates detecte : %s\n' "$STORAGE"

# Template deja telecharge ? La 1re colonne de 'pveam list' est la reference
# complete du volume (ex. local:vztmpl/debian-12-standard_...tar.zst)
TPL_REF="$(pveam list "$STORAGE" 2>/dev/null | awk '/debian-12/ {print $1}' | tail -n1)"

if [ -z "$TPL_REF" ]; then
  printf "Telechargement du template Debian 12 dans %s...\n" "$STORAGE"
  TPL_NAME="$(pveam available 2>/dev/null | awk '/debian-12-standard/ {print $2}' | sort | tail -n1)"
  [ -n "$TPL_NAME" ] || die "Template Debian 12 introuvable dans 'pveam available'."
  pveam download "$STORAGE" "$TPL_NAME"
  TPL_REF="$(pveam list "$STORAGE" 2>/dev/null | awk '/debian-12/ {print $1}' | tail -n1)"
fi
[ -n "$TPL_REF" ] || die "Impossible d'obtenir le template Debian 12."

# Normaliser la reference : 'local:vztmpl/fichier', 'vztmpl/fichier' ou 'fichier'
case "$TPL_REF" in
  "$STORAGE":*) ;;
  vztmpl/*) TPL_REF="${STORAGE}:${TPL_REF}" ;;
  *) TPL_REF="${STORAGE}:vztmpl/${TPL_REF}" ;;
esac
printf 'Template utilise : %s\n' "$TPL_REF"

CT_PASSWORD="$(openssl rand -base64 12)"

# ---------------------------------------------------------------------------
# Stockage disque du conteneur : auto-detection si non fourni
# (avertissement : l'auto-detection prend le PREMIER stockage avec contenu
#  'Container' — preciser ROOTFS si ce n'est pas celui souhaite)
# ---------------------------------------------------------------------------
if [ -z "$ROOTFS" ]; then
  ROOTDISK="$(pvesm status --content rootdir 2>/dev/null | awk 'NR>1 && NF>=3 {print $1}' | head -n1)"
  [ -n "$ROOTDISK" ] || die "Aucun stockage avec le contenu 'Container' (rootdir). Relance avec ROOTFS=<stockage>:<Go> (ex. ROOTFS=local-zfs:5)."
  ROOTFS="${ROOTDISK}:5"
  printf "Attention : stockage disque auto-detecte '%s'. Relance avec ROOTFS=<stockage>:5 si ce n'est pas celui voulu.\n" "$ROOTFS"
fi

# ---------------------------------------------------------------------------
# Creation du conteneur
# ---------------------------------------------------------------------------
step "2/7 Creation du conteneur $CTID ($CT_HOSTNAME)"

CT_HOSTNAME="meal-plan"

pct create "$CTID" "$TPL_REF" \
  --hostname "$CT_HOSTNAME" \
  --unprivileged 1 \
  --cores 1 \
  --memory 2048 \
  --swap 2048 \
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
if [ "$NET_OK" -ne 1 ]; then
  die "Le conteneur n'obtient pas d'acces reseau (DHCP). Verifie le pont '$BRIDGE' (ip link show $BRIDGE) ou relance avec BRIDGE=<ton pont>."
fi
printf "Reseau OK.\n"

# ---------------------------------------------------------------------------
# Script d'installation execute A L'INTERIEUR du conteneur
# ---------------------------------------------------------------------------
step "3/7 Ecriture du script d'installation du conteneur"

INNER="$(mktemp)"
cat > "$INNER" <<'INNEREOF'
#!/usr/bin/env bash
# Installation de Meal Plan dans le conteneur (execute par pct exec).
set -eu
trap 'printf "\nERREUR interne ligne %s : %s\n" "$LINENO" "$BASH_COMMAND" >&2' ERR
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
  {
    echo "AUTH_SECRET=$AUTH_SECRET"
    echo "AUTH_TRUST_HOST=true"
    echo "TZ=${TZ}"
    echo "PORT=${PORT}"
  } > .env.local
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
># Le update.sh versionné dans le dépôt (backup de base, db:ensure, healthcheck)
# est déposé par le git clone ci-dessus : ne PAS l'écraser par une version naïve.
chmod +x "$APP_DIR/update.sh"

echo "Installation terminee dans le conteneur."
INNEREOF

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
