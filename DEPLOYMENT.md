# Guide de déploiement — Meal Plan en beta sur Proxmox

*Ce guide explique pas à pas, et avec les pourquoi, comment installer l'application sur ton serveur Proxmox pour la tester en beta depuis un téléphone.*

---

## Vue d'ensemble : ce qu'on est en train de faire

Avant les commandes, le schéma mental :

```
[Ton téléphone]                    [Proxmox (ton serveur)]           
  Navigateur  ──── réseau Wi-Fi ────▶  Conteneur LXC "meal-plan"
  http://192.168.x.x:3000               ├─ Node.js fait tourner l'application
                                        └─ data/sqlite.db = toutes les données
```

- **Proxmox** est l'outil qui gère ton serveur. Il crée des **conteneurs LXC** : des mini-Linux isolés, comme des VM allégées. On va en créer un dédié à l'application.
- L'application est un **serveur web** : un programme qui tourne en continu dans le conteneur et répond aux requêtes du navigateur. On l'installe dans le conteneur, on la lance, et elle écoute sur le **port 3000**.
- Le **téléphone** n'a rien à installer : son navigateur ouvre l'adresse du conteneur, comme il ouvrirait un site web.
- Toutes les données (recettes, repas, comptes) tiennent dans **un seul fichier** : `data/sqlite.db`. Sauvegarder ce fichier = sauvegarder toute l'application.
- On déploie la branche **`beta`** : c'est la version à tester, séparée de `main` (la référence stable, marquée par le tag `last-stable`).

Ordre des opérations, et pourquoi dans cet ordre :

1. Créer le conteneur (l'endroit où tout vivra)
2. Installer Node.js dedans (le moteur qui fait tourner l'application)
3. Télécharger le code de la branche `beta`
4. Configurer (secret de session, fuseau horaire)
5. Créer la base de données et le compte admin
6. Compiler et lancer l'application en service permanent
7. Y accéder depuis le téléphone

---

## Étape 1 — Créer le conteneur LXC (dans l'interface web de Proxmox)

**Où** : interface Proxmox (`https://IP_DE_TON_PROXMOX:8006`) → bouton **Create CT**.

1. **General** : hostname `meal-plan`, choisis un mot de passe root, décoche "Unprivileged" seulement si tu sais pourquoi (laisse coché par défaut).
2. **Template** : **Debian 12** (télécharge-la d'abord via Templates si absente).
3. **Disks** : 5 Go suffisent largement (le code fait ~200 Mo, la base quelques Mo).
4. **CPU** : 1 cœur suffit pour une famille.
5. **Memory** : 1024 Mo (512 Mo fonctionneraient, mais le build a besoin d'air).
6. **Network** : garde DHCP (le routeur donnera une adresse au conteneur) ou fixe une IP statique. **Note l'adresse IP** : c'est l'adresse que tu taperas sur le téléphone.
7. Termine, sélectionne le conteneur, **Start**, puis ouvre sa **Console** (bouton en haut).

**Pourquoi un conteneur** : l'application vit isolée du reste du serveur ; tu peux faire un **snapshot** Proxmox avant chaque test risqué, et la supprimer proprement quand la beta est finie, sans toucher aux autres VM.

**Réglage du fuseau horaire** (important, voir étape 5) — depuis le Shell Proxmox (hôte) :

```bash
pct set <ID_DU_CONTENEUR> --timezone Europe/Paris
```

---

## Étape 2 — Installer Node.js et Git dans le conteneur

**Où** : la Console du conteneur (étape 1). **Quand** : une seule fois, à la création.

```bash
apt update && apt install -y curl git build-essential python3
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v    # doit afficher v22.x  (Next.js 16 exige Node 20 minimum)
```

**Pourquoi** :
- `git` : pour télécharger le code depuis GitHub.
- `build-essential` et `python3` : deux dépendances du projet (`better-sqlite3` et `argon2`) contiennent du code compilé. C'est pour ça qu'il faut installer **dans le conteneur** et ne jamais copier le dossier `node_modules` depuis Windows — un binaire Windows ne tourne pas sous Linux.
- `node -v` : vérification que l'installation a réussi.

---

## Étape 3 — Télécharger le code de la beta

**Où** : Console du conteneur. **Quand** : une fois, puis à chaque mise à jour.

```bash
mkdir -p /opt && cd /opt
git clone -b beta https://github.com/Leviath42/meal_plan.git
cd meal_plan
npm ci
```

**Pourquoi** :
- `-b beta` : prend la branche `beta` (la version de test), pas `main`.
- `npm ci` (et non `npm install`) : installe exactement les versions verrouillées dans `package-lock.json` — reproductible, c'est la commande recommandée pour un déploiement. Cette étape prend plusieurs minutes (compilation des modules natifs) : c'est normal.

---

## Étape 4 — Configurer l'application : le fichier `.env.local`

**Où** : Console du conteneur, dans le dossier `/opt/meal_plan`. **Quand** : une seule fois.

D'abord, générer une clé secrète aléatoire (elle signera les sessions de connexion) :

```bash
openssl rand -base64 32
```

Copie la valeur affichée, puis crée le fichier :

```bash
nano .env.local
```

Contenu (remplace `XXX` par la valeur générée) :

```
AUTH_SECRET=XXX
AUTH_TRUST_HOST=true
TZ=Europe/Paris
PORT=3000
```

Sauver avec `Ctrl+O`, `Entrée`, quitter avec `Ctrl+X`.

**Pourquoi chaque ligne** :

| Variable | Rôle | Sans elle, que se passe-t-il ? |
|---|---|---|
| `AUTH_SECRET` | Clé qui signe les cookies de session (identifie qui est connecté) | **L'application refuse de démarrer en production** — garde volontairement ajoutée : un secret par défaut connu de tous serait une faille |
| `AUTH_TRUST_HOST` | Autorise NextAuth à faire confiance à l'hôte appelant | **La connexion échoue** avec une erreur `UntrustedHost` : l'app est servie sur une IP LAN, pas un domaine reconnu |
| `TZ` | Fuseau horaire du processus | Entre 22h et minuit heure française, le serveur croirait qu'on est "la veille" et se tromperait sur l'interdiction de planifier dans le passé |
| `PORT` | Port d'écoute (3000 par défaut) | — (à changer si le port est déjà pris) |

Ce fichier n'est **pas** dans Git (il contient un secret) : il vit uniquement dans le conteneur.

---

## Étape 5 — Créer la base de données

**Quand** : une seule fois, après l'étape 4.

```bash
npm run db:migrate
```

**Pourquoi** : applique la migration `drizzle/0000_*.sql` qui crée toutes les tables dans `data/sqlite.db`. Sur le PC de dev cette base existait déjà ; sur le conteneur elle part de zéro, il faut donc la créer. À refaire (réflexe) à chaque `git pull` si une nouvelle migration apparaît — mais la commande est idempotente : elle ne fait rien si tout est déjà appliqué.

---

## Étape 6 — Créer le compte administrateur

```bash
npm run create-admin -- ton@email.fr 'TonMotDePasse2000'
```

**Pourquoi** : le premier compte, rôle ADMIN. C'est lui qui pourra valider les comptes créés ensuite par la famille (rôle GUEST → MEMBER via la page "Utilisateurs"). Le mot de passe est transmis en argument, jamais stocké en clair (haché en Argon2).

---

## Étape 7 (optionnel) — Données de démonstration

```bash
npm run seed
```

**Pourquoi** : insère 45 recettes et 108 ingrédients, pratique pour tester immédiatement le calendrier. À sauter si tu veux partir d'une base vierge. (`npm run seed:clear` vide tout.)

---

## Étape 8 — Compiler la version de production

```bash
npm run build
```

**Pourquoi** : Next.js a deux modes — `dev` (non optimisé, lent, pour coder) et `start` (version compilée et optimisée). On compile une fois ici, on lance ensuite la version compilée. Comptez 1 à 3 minutes.

---

## Étape 9 — Lancer l'application en service permanent (PM2)

**Le problème** : si on lance `npm start` dans la console et qu'on ferme la console (ou que le serveur redémarre), l'application meurt. **La solution** : un gestionnaire de processus qui la relance automatiquement.

```bash
npm install -g pm2
pm2 start npm --name meal-plan -- start
pm2 save
pm2 startup    # puis exécuter la commande qu'il affiche
```

**Pourquoi** :
- `pm2 start ... -- start` : lance `npm start` en arrière-plan, le surveille, le relance s'il plante.
- `pm2 save` : mémorise la liste des applications à relancer.
- `pm2 startup` : fait en sorte que PM2 démarre au boot du conteneur (il affiche une commande `sudo env PATH=...` à copier-coller une fois).

Commandes utiles ensuite :

```bash
pm2 status            # est-ce que ça tourne ?
pm2 logs meal-plan     # voir les logs en direct (Ctrl+C pour quitter)
pm2 restart meal-plan  # redémarrer après une mise à jour
```

---

## Étape 10 — Tester depuis le téléphone

1. Dans la console du conteneur : `ip a` → repérer l'adresse IPv4 (ex. `192.168.1.50`).
2. Téléphone connecté **au même Wi-Fi**, ouvre le navigateur : `http://192.168.1.50:3000`.
3. Se connecter avec le compte admin créé à l'étape 6. Les autres membres de la famille peuvent créer leur compte via "Créer un compte" (ils seront GUEST, à valider par l'admin).

**Pourquoi http et pas https pour l'instant** : en réseau local, le trafic ne sort pas de chez toi ; le HTTPS sera nécessaire le jour où tu exposeras l'application à l'extérieur (via un reverse proxy — Nginx ou Traefik dans un autre conteneur, avec un nom DNS et un certificat ; hors scope de ce guide).

**Tester depuis l'extérieur plus tard** : le cahier des charges prévoit la consultation de la liste de courses au supermarché — attendre la phase F04 (partage) ou monter un VPN (Tailscale/WireGuard) sur le téléphone, qui donne accès au LAN à distance de façon chiffrée. Ne jamais ouvrir le port 3000 directement sur Internet.

---

## Étape 11 — Mettre à jour la beta

**Quand** : quand une nouvelle version de test est poussée sur la branche `beta`.

```bash
cd /opt/meal_plan
pm2 stop meal-plan          # on stoppe le temps de la mise à jour
git pull origin beta
npm ci                      # si package-lock.json a changé
npm run db:migrate          # idempotent : applique les nouvelles migrations s'il y en a
npm run build
pm2 start meal-plan
```

**Astuce** : avant une mise à jour, faire un **snapshot Proxmox** du conteneur (interface web → Snapshot → Take Snapshot). Retour arrière en un clic si la nouvelle version casse quelque chose. Les données sont dans `data/sqlite.db` — pour une sauvegarde hors Proxmox, copier ce fichier suffit :

```bash
# depuis le conteneur, la base est déjà sauvegardée dans le snapshot Proxmox.
# pour une copie externe (vers le PC, via scp depuis le PC) :
# scp root@IP_CONTENEUR:/opt/meal_plan/data/sqlite.db ./sauvegarde-$(date +%F).db
```

---

## Dépannage rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| L'application refuse de démarrer : « AUTH_SECRET est requis en production » | Étape 4 non faite ou fichier mal nommé | Vérifier `.env.local` à la racine du projet, variable `AUTH_SECRET` renseignée |
| Connexion impossible : erreur `UntrustedHost` | Absence de `AUTH_TRUST_HOST=true` | L'ajouter dans `.env.local`, puis `pm2 restart meal-plan` |
| `npm ci` échoue sur `better-sqlite3` | Outils de compilation absents | `apt install -y build-essential python3` puis relancer `npm ci` |
| Le site est inaccessible depuis le téléphone | Mauvaise IP, ou réseau différent (Wi-Fi invité) | `ip a` dans le conteneur ; vérifier que téléphone et conteneur sont sur le même réseau |
| Les repas du soir apparaissent "hier" ou l'app refuse un repas d'aujourd'hui | Fuseau horaire du conteneur | Étape 1 (timezone Proxmox) ou variable `TZ` dans `.env.local`, puis redémarrer |
| « EADDRINUSE » au démarrage | Le port 3000 est déjà pris | Changer `PORT` dans `.env.local` |

---

*Récapitulatif des commandes complètes, pour aller vite une fois le conteneur créé :*

```bash
apt update && apt install -y curl git build-essential python3
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
cd /opt && git clone -b beta https://github.com/Leviath42/meal_plan.git && cd meal_plan
npm ci
openssl rand -base64 32   # copier le résultat
cat > .env.local <<EOF
AUTH_SECRET=COLLER_ICI
AUTH_TRUST_HOST=true
TZ=Europe/Paris
EOF
npm run db:migrate
npm run create-admin -- ton@email.fr 'MotDePasse'
npm run build
npm install -g pm2
pm2 start npm --name meal-plan -- start
pm2 save && pm2 startup
ip a   # noter l'IPv4 -> http://IPv4:3000 depuis le téléphone
```
