# Démo publique — runbook de déploiement (Proxmox)

*Instance de démonstration de la **vraie application**, exposée sur `demo.mealplan.neliora.fr`. Données fictives, réinitialisées chaque nuit. Dernière mise à jour : 2026-10-27.*

## Objectif et architecture

Faire visiter l'application réelle (pas une maquette) à tout visiteur du teaser, sans compte à créer. L'instance est **jetable par conception** :

- **1 service = 1 CT** (règle homelab) : CT **107** dédié, unprivileged, Debian 12, 1 c / 2 Go / 8 Go (2 Go requis pour le build Next.js, redescendable ensuite).
- Branche suivie : **`main`** (même version que la production).
- Base SQLite **indépendante** de la prod et de la beta : aucune donnée réelle n'entre dans ce CT, et rien n'y est à sauvegarder — le CT est **reconstructible de bout en bout via ce runbook** (donc pas de vzdump nécessaire).
- Exposition : tunnel Cloudflare dédié, **aucun port entrant**.

## 1. Installation (une commande, depuis le shell de l'hôte Proxmox)

1. Créer le tunnel dans Cloudflare Zero Trust : *Networks → Tunnels → Create a tunnel*, nom `meal-plan-demo`, copier le jeton (`eyJ...`).
2. Onglet *Public Hostname* du tunnel : sous-domaine **`demo`**, domaine **`mealplan.neliora.fr`**, service `HTTP://localhost:3000`.
3. Lancer l'installation :

```bash
wget -qO /root/proxmox-install.sh https://raw.githubusercontent.com/Leviath42/meal_plan/main/scripts/proxmox-install.sh
BRANCH=main CF_TUNNEL_TOKEN=eyJ... bash /root/proxmox-install.sh 107 admin-demo@neliora.fr 'MotDePasseAdminSolide' yes
```

⚠️ Le mot de passe admin ne doit **jamais être publié** : c'est le compte qui gère la démo (page /deploy incluse). Les visiteurs utiliseront le compte démo ci-dessous.

## 2. Post-configuration (règles homelab)

```bash
pct set 107 --onboot 1                                    # redémarre seul après coupure
pct set 107 --timezone Europe/Paris                        # fuseau des dates de planning
pct set 107 --ipconfig0 ip=192.168.1.55/24,gw=192.168.1.1  # IP fixe hors pool DHCP (à confirmer libre)
```

## 3. Données de démonstration

Dans le CT (`pct enter 107`, dossier `/opt/meal_plan`) :

```bash
npm run seed                      # 45 recettes + 108 ingrédients
npm run db:seed-demo-planning     # semaine complète dès aujourd'hui + historique fictif
```

Puis créer le **compte visiteur** (celui à publier sur le site) : « Créer un compte » sur la page de connexion avec `demo@neliora.fr` + un mot de passe simple jetable, puis le valider GUEST → MEMBER avec le compte admin (page Utilisateurs). **Jamais ADMIN.**

Snapshot « pristine » (base de référence du reset nocturne) :

```bash
pm2 stop meal-plan
cp data/sqlite.db data/demo-pristine.db
pm2 start meal-plan
```

## 4. Reset nocturne (données jetables)

Un visiteur peut tout casser : la base repart de zéro chaque nuit. Créer `/opt/meal_plan/demo-reset.sh` :

```bash
#!/bin/bash
set -e
cd /opt/meal_plan
pm2 stop meal-plan
rm -f data/sqlite.db data/sqlite.db-wal data/sqlite.db-shm
cp data/demo-pristine.db data/sqlite.db
npm run db:seed-demo-planning   # semaine datée du jour
pm2 start meal-plan
echo "Reset démo OK le $(date '+%F %T')" >> data/demo-reset.log
```

```bash
chmod +x demo-reset.sh
(crontab -l 2>/dev/null; echo "35 4 * * * /opt/meal_plan/demo-reset.sh") | crontab -
```

Durée : ~30 s d'indisponibilité à 04 h 35. La seed recrée une semaine datée du jour : la démo n'est jamais périmée.

## 5. Supervision

Uptime Kuma (CT 111) : moniteur **Mealplan-demo** → `https://demo.mealplan.neliora.fr/login`, codes acceptés `200-299, 301-308` (même contournement que la prod tant que `/api/health` n'existe pas), notification sur le canal existant.

## 6. Sécurité — assomptions assumées (pré-lancement)

- Inscriptions **fermées de fait** : nouveau compte = GUEST, validé manuellement → personne ne crée un compte seul ; le reset nocturne purge tout compte temporaire.
- Compte publié = MEMBER (pas d'accès admin, pas de page /deploy).
- CSP incomplète + sessions non révocables : assumé pour une démo, **à revoir avant commercialisation**.
- Pas de rate limiting dédié sur /login : le tunnel Cloudflare absorbe le brute force basique ; règle WAF rate limiting en option.
- Ce CT expose une app pré-release publiquement : surface d'attaque réelle (pivert LAN si RCE). Garder unattended-upgrades actif, un seul service dans le CT, et le supprimer si le risque devient inconfortable — il est jetable.
- RGPD : uniquement des données fictives ; le mentionner sous le lien de démo (« données fictives, réinitialisées chaque nuit »).

## 7. Mise à jour de la démo

```bash
pct exec 107 -- bash /opt/meal_plan/update.sh   # suit main, sauvegarde la base avant
```

Puis refaire le snapshot pristine (section 3) pour que le reset nocturne reparte d'une base à jour.

## 8. Lien depuis le site (quand la démo est validée)

- Teaser mealplan.neliora.fr : bouton « Essayer la démo » → `https://demo.mealplan.neliora.fr` + identifiants du compte démo + mention « données fictives, réinitialisées chaque nuit ».
- Vitrine neliora.fr : bouton « Voir la démo » à côté de « Découvrir Meal Plan ».

## Checkpoint

- [ ] CT 107 créé, onboot, IP fixe 192.168.1.55
- [ ] Tunnel opérationnel : `https://demo.mealplan.neliora.fr` répond en HTTPS
- [ ] Compte démo MEMBER créé et validé ; admin fort, non publié
- [ ] Seed + planning démo : semaine complète visible sans rien faire
- [ ] `demo-pristine.db` + cron 04:35 testés une fois à la main
- [ ] Moniteur Kuma « Mealplan-demo » ajouté, notification branchée
- [ ] Registre homelab mis à jour avec le CT 107
