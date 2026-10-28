# Plan de reprise d'activité (PRA) — Meal Plan

> **v1.0 (24 oct. 2026).** Règle : *un PRA non répété n'est pas un PRA* — l'exercice chronométré (§6) fait partie du livrable.

## 1. Objectifs

| Objectif | Cible | Signification concrète |
|---|---|---|
| RTO (délai de reprise) | 2 h | la famille retrouve planning et liste de courses en moins de 2 h (une soirée) |
| RPO (perte max de données) | 24 h | au plus une journée de saisie (recettes, repas, coches) |

## 2. Composants critiques

Point clé : **toutes les données tiennent dans un seul fichier** (`data/sqlite.db`) — recettes, repas, comptes, jetons, paramètres. Sauvegarder ce fichier = sauvegarder toute l'application.

| Composant | Emplacement | Si perdu |
|---|---|---|
| Base SQLite | `/opt/meal_plan/data/sqlite.db` (+ `-wal`/`-shm`) | **tout** le contenu |
| Sauvegardes de base | `data/backups/` (10 dernières, horodatées) + copies externes | capacité de restauration |
| `.env.local` | `/opt/meal_plan/.env.local` | `AUTH_SECRET` (les sessions sautent, aucune donnée perdue), `TZ`, config |
| Conteneur LXC Proxmox | CT de prod (`/opt/meal_plan`) | rien d'irrécupérable si §3 est respecté |
| Tunnel Cloudflare nommé | configuration Cloudflare | accès extérieur uniquement (le LAN continue) |

Dépendances externes : hôte Proxmox, gestionnaire DNS/tunnel, hébergeur VPS le jour du passage commercial (cf. cahier des charges §5).

## 3. Prérequis de sauvegarde (ce qui doit être vrai pour tenir le RPO)

| # | Prérequis | État |
|---|---|---|
| 1 | Sauvegarde horodatée **avant chaque mise à jour** (`update.sh`, 10 conservées dans `data/backups/`) | ✅ automatique |
| 2 | Rollback testé : `bash update.sh rollback` ou page **/deploy → Retour arrière** (ADMIN) | ✅ |
| 3 | **Copie quotidienne de `sqlite.db` hors conteneur** | ✅ couverte par le vzdump quotidien du CT (job 05:00) → export chiffré R2 (rétention 2 j offsite) — **restauration prouvée le 28/10/2026** (CT scratch, RTO 10 min ; recette : runbook R2 vibe_docs) |
| 4 | Sauvegarde du `.env.local` hors conteneur | ✅ embarquée dans le vzdump du CT (export chiffré R2) — présence vérifiée dans la restauration test du 28/10/2026. Sans `AUTH_SECRET` sauvegardé, les sessions sautent (aucune donnée perdue) |
| 5 | Snapshot Proxmox avant manipulation risquée (interface web → Snapshot) | réflexe manuel |

Export manuel ponctuel (la couverture quotidienne est assurée depuis le 26/10/2026 par la chaîne vzdump 05:00 → rclone crypt → R2, restauration prouvée le 28/10/2026) :

```bash
scp root@IP_CONTENEUR:/opt/meal_plan/data/sqlite.db ./sauvegarde-$(date +%F).db
```

## 4. Scénarios de sinistre et procédures

### S1 — Échec de mise à jour / base endommagée (le plus courant)
1. `update.sh` relance l'app même en cas d'échec (healthcheck HTTP inclus) ; si besoin : page **/deploy → Retour arrière**, ou `pct exec <CTID> -- bash /opt/meal_plan/update.sh rollback`.
2. Si la base reste corrompue : `pm2 stop meal-plan`, restaurer l'avant-dernière sauvegarde de `data/backups/`, **supprimer les résidus `-wal`/`-shm`**, `npm run db:ensure`, `pm2 restart`.
3. Vérifications §5.

### S2 — Perte du conteneur (suppression, hôte HS)
1. Réinstaller via le script : `BRANCH=<branche du CT> bash scripts/proxmox-install.sh <CTID> …` (cf. [deploiement-proxmox.md](deploiement-proxmox.md) ; la branche est mémorisée dans `/opt/meal_plan/.deploy-branch` — la consigner hors CT à l'installation).
2. Recréer `.env.local` (`AUTH_SECRET` neuf ou sauvegardé, `AUTH_TRUST_HOST=true`, `TZ=Europe/Paris`).
3. Restaurer les données — deux routes :
   - **Offsite, prouvée le 28/10/2026 (RTO 10 min)** : télécharger l'archive du CT depuis R2 (`rclone copy "r2crypt:vzdump/vzdump-lxc-103-<date>.tar.zst" /root/r2-restore-test/`) puis `pct restore <CTID> /root/r2-restore-test/<archive> --storage local-zfs` — **retirer `net0` avant tout démarrage du clone** (sinon son daemon cloudflared détourne le tunnel de prod) ; recette détaillée : runbook R2 §« Restauration testée » (vibe_docs) ;
   - copie manuelle : `pct push <CTID> ./sauvegarde-XXXX.db /opt/meal_plan/data/sqlite.db`, supprimer `-wal`/`-shm`, puis `npm run db:ensure && npm run db:migrate && pm2 restart meal-plan`.
4. Reconfigurer le tunnel Cloudflare nommé (cf. déploiement).
5. Vérifications §5.

### S3 — Jetons de partage compromis / intrusion
1. Page `/share` (ADMIN) : **révoquer tous les jetons**, en recréer.
2. Rotation d'`AUTH_SECRET` : toutes les sessions sautent (conséquence = reconnexion, aucune perte de données).
3. Page Utilisateurs : vérifier les comptes inconnus, réinitialiser les mots de passe si besoin.
4. Rappel C-011 : l'historique git contient d'anciennes versions de la base — purge `git filter-repo` + révocation des jetons pré-retrait restent à décider (journal des correctifs).

### S4 — Tunnel DNS indisponible (panne Cloudflare)
1. Pas de sinistre de données : accès LAN direct ; le 502 disparaît au retour du tunnel.
2. Une panne DNS n'est pas une panne app (leçon C-035/C-036) — cf. tableau de dépannage de [deploiement-proxmox.md](deploiement-proxmox.md).

## 5. Vérifications post-restauration

- [ ] Page de connexion accessible en HTTP 200 (LAN, puis tunnel)
- [ ] `npm run db:ensure` sans erreur (integrité + schéma réalignés)
- [ ] Connexion avec un compte connu ; recettes et planning visibles
- [ ] Liste de courses : dernière liste intacte (coches incluses)
- [ ] Page /deploy : version affichée cohérente avec la branche
- [ ] Un export ICS sur jeton : événements aux bonnes dates (arithmétique calendaire — leçon C-024)

## 6. Exercice chronométré (à faire)

> Point du 28/10/2026 : la partie offsite est **déjà prouvée** (archive R2 → `pct restore` sur CT scratch → `sqlite.db` + `.env.local` vérifiés, 10 min). Reste à jouer l'exercice complet — CT vierge + checklist §5 entière — pour valider aussi le chemin applicatif.

Reconstruire un CT **vierge** en ne suivant que ce document, chronomètre en main :

- cible : RTO tenu (≤ 2 h), base restaurée, vérifications §5 toutes vertes ;
- noter : durée réelle, chemins/commandes faux ou ambigus, prérequis manquants (§3) ;
- corriger ce PRA dans la foulée — le PRA est vivant, il se réécrit à chaque exercice ;
- périodicité : 1×/an, ou après tout changement majeur (changement d'hôte, passage en SaaS multi-foyers — cf. cahier des charges §5).
