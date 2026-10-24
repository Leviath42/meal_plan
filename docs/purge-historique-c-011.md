# Purge de l'historique git — C-011

**Statut :** runbook prêt — exécution réservée au propriétaire (réécriture d'historique + force-push). Durée ~30 min, coût **0 €**.
**Créé :** 24 oct. 2026 (audit « socle commercial », cahier des charges §6).
**Références :** [correctifs.md](correctifs.md) C-011 · procédure officielle : [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## 1. Ce qui a fuité et pourquoi agir

Entre le **6 et le 8 oct. 2026**, la base `data/sqlite.db` a été versionnée sur `main` — **11 commits**, du retrait de l'entrée `.gitignore` (`8fb13c11f1`) au dernier commit la touchant (`88371afa40`). Le repo étant **public**, chaque version intermédiaire de la base reste récupérable via l'API GitHub, même absente du HEAD actuel.

Contenu exposé dans ces versions de la base :

- adresses e-mail des comptes familiaux ;
- **hashes Argon2 des mots de passe** (attaques hors ligne possibles) ;
- questions / réponses secrètes ;
- **jetons de partage ICS/API en clair** (le hachage sha256 des jetons ne date que de C-012).

Hors périmètre, vérifié le 24 oct. 2026 : `.env.local` n'a **jamais** été commité — aucune clé d'infrastructure (Stripe, tunnel, etc.) n'est concernée.

## 2. Étape 0 — révoquer les jetons (5 min, à faire AVANT la purge)

C'est le seul risque **actif** : un jeton clair pré-retrait donne accès au planning via le tunnel Cloudflare tant qu'il existe en base.

1. `/share` en ADMIN → **révoquer tous les jetons** créés avant le 8 oct. 2026 (par prudence : tous).
2. Recréer les jetons utiles (kiosque tablette, ICS, Home Assistant) et reconfigurer les consommateurs.
3. Sessions : rien à faire — `maxAge` 7 j depuis C-025 → les sessions d'avant le 8 oct. sont expirées d'elles-mêmes.
4. Recommandé : changer les mots de passe des comptes familiaux si l'un est faible — les hashes ont circulé.

## 3. Étape 1 — réécrire l'historique (~15 min)

Sur un poste avec `git` et Python ≥ 3.6 (le CT de production convient) :

```bash
pip install git-filter-repo
git clone --mirror https://github.com/Leviath42/meal_plan.git
cd meal_plan.git
git filter-repo --path data/sqlite.db --invert-paths --sensitive-data-removal
```

- `--path … --invert-paths` : retire `data/sqlite.db` de **tout** l'historique, toutes branches confondues.
- `--sensitive-data-removal` : remplace les messages des commits touchés par une notice de retrait (git-filter-repo récent ; si l'option n'existe pas dans la version installée, l'omettre).
- git-filter-repo **supprime le remote** `origin` par sécurité — le réajouter puis forcer la poussée de **toutes** les branches et tags :

```bash
git remote add origin https://github.com/Leviath42/meal_plan.git
git push --force origin --all       # toutes les branches (main, beta, dependabot/*)
git push --force origin --tags      # dont le tag last-stable
```

⚠️ Tous les SHAs antérieurs changent (l'historique entier est réécrit). Les liens vers d'anciens commits cités dans les docs d'archives ne pointeront plus — c'est accepté.

## 4. Étape 2 — nettoyage côté GitHub (5 min + délai Support)

Le force-push ne retire pas les **vues cachées** ni les commits *dangling* (accessibles par SHA direct pendant ~90 jours). Demander à GitHub de les purger — **gratuit** :

1. Ouvrir un ticket sur <https://support.github.com> : demander la suppression des *cached views* et *dangling commits* pour `Leviath42/meal_plan`, suite à une *sensitive data removal* (base SQLite contenant des données personnelles, déjà filtrée avec `git filter-repo --sensitive-data-removal`).
2. Vérifier au préalable le nombre de **forks** sur la page du repo ; si > 0, demander dans le même ticket la propagation du nettoyage au réseau de forks.

## 5. Étape 3 — vérifications post-purge (5 min)

```bash
git clone https://github.com/Leviath42/meal_plan.git /tmp/mp-check && cd /tmp/mp-check
git log --all --full-history -- data/sqlite.db   # doit être vide
```

- L'URL <https://github.com/Leviath42/meal_plan/commit/88371afa40> doit renvoyer 404 (immédiatement pour le contenu ; après passage du Support pour la vue cachée).
- **Re-cloner** le repo de travail local — l'ancien clone référence des SHAs obsolètes.
- **CTs** : `update.sh` fait `git reset --hard origin/<branche>` → lancer un update sur le CT **beta** et le CT **prod** juste après la purge pour réaligner.
- **Dependabot** : les branches `dependabot/*` sont réécrites ; les PR ouvertes peuvent se fermer — les rouvrir ou attendre le passage hebdomadaire.

## 6. Clôture

- Cocher C-011 dans [cahier-des-charges.md](cahier-des-charges.md) §6 et dans la section 🛡️ de [roadmap.md](roadmap.md).
- Ajouter la mention « purge exécutée le … » à C-011 dans [correctifs.md](correctifs.md).
