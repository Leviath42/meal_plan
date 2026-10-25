# Manuel utilisateur — Meal Plan

*Guide d'utilisation au quotidien, pour toute la famille. Dernière mise à jour : 2026-10-10.*

---

## 📱 Installation sur téléphone (PWA)

L'application s'installe comme une application native, sans passer par un store.

**Android (Chrome)** : ouvre l'URL de l'application → menu ⋮ → **« Installer l'application »**.
**iPhone/iPad (Safari)** : bouton Partager → **« Sur l'écran d'accueil »**.

L'icône neutre « chronomètre & couverts » apparaît alors sur ton écran d'accueil, et l'app s'ouvre en plein écran (sans barre de navigateur). Le lancement affiche un splash noir sobre avec l'icône centrée.

> 💡 Après une mise à jour de l'icône par l'administrateur : elle se rafraîchit d'elle-même sous 1-2 jours sur Android ; sur iOS, désinstalle puis réinstalle l'app.

---

## 🗓️ Planifier les repas (page d'accueil et /calendar)

### Voir le planning
- La **page d'accueil** affiche 7 jours (aujourd'hui → J+6)
- La page **Calendrier** affiche 19 jours, avec navigation par **jour** (‹ › autour du jour principal), par **mois** (‹‹ ››) et le bouton **Aujourd'hui** pour revenir
- Les repas sont regroupés par type (petit-déjeuner, déjeuner, goûter, dîner), chaque type a sa couleur

### Ajouter un repas
1. Clique le bouton **+** sous le jour voulu
2. Choisis le **type de repas** (dîner par défaut)
3. Choisis une **recette** : tape des mots-clés dans le champ de recherche (« poulet curry », sans vous soucier des accents) — les résultats se filtrent à la saisie ; navigue avec ↑↓ et valide avec Entrée, ou clique une proposition. Le bouton ✕ retire la sélection
   - Tu peux aussi planifier **sans recette** (ex. « soirée pizza ») : laisse le champ vide et écris une note
4. **Suggérer** : le bouton te propose 3 recettes non planifiées récemment
5. Le **nombre de couverts** est pré-rempli (paramétrable dans Paramètres)
6. Valide — le badge coloré apparaît dans le planning

### Déplacer / modifier / supprimer un repas
- **Cliquer** un badge ouvre le menu du repas (modifier, replanifier, supprimer)
- **Glisser-déposer** : attrape un badge et dépose-le sur un autre jour/créneau ; dépose-le sur la **zone rouge** en bas d'écran pour le supprimer
- **Palette de recettes** (page Calendrier) : ouvre le panneau « Recettes » et glisse une recette directement sur un jour

### Repas passés
Les jours passés sont en **lecture seule** : impossible d'y ajouter ou de supprimer un repas. C'est voulu — l'historique (« quand avons-nous mangé ce plat ? ») doit rester fiable.

### L'indicateur « • » sur un badge
Un point signifie que cette recette a déjà été servie il y a moins de 30 jours (la date exacte est dans l'info-bulle). Utile pour éviter de re-servir la même chose trop vite. Il se met à jour à chaque nouvelle planification.

### Générer un menu complet
Bouton **Générer…** en haut du calendrier : remplit automatiquement une période selon tes règles (jours de semaine, types de repas/plats, antidoublon respecté). Modes « combler » (seulement les créneaux vides) ou « remplacer ».

---

## 🍳 Gérer les recettes (/recipes)

- **+ Nouvelle recette** : titre, description, type de plat, temps, couverts par défaut, **étapes de préparation (optionnelles)**, tags, source
- Le **créateur** de la recette est mémorisé automatiquement (ton compte) et affiché sur la page de la recette
- **Recherche** en haut de la liste : par titre, description, tags, type de plat
- Les recettes sont regroupées par type de plat (sections repliables)
- **Ingrédients** : ajoute-les par recherche (mêmes mots-clés que le planning), avec quantité et unité ; crée un ingrédient à la volée s'il n'existe pas encore (le rayon se choisit par recherche ou se crée au clavier)

---

## 🧺 Liste de courses (/shopping-list)

### Générer depuis le planning
Bouton **Générer** (à côté du titre) : choisis 7/14/30 jours ou des dates précises, valide — la liste se crée et le **modal se ferme tout seul**. Les quantités sont mises à l'échelle selon les couverts prévus.

### Au supermarché
- Coche les articles au fur et à mesure — **les articles achetés sont masqués par défaut** (décoche « Masquer les achetés » pour les revoir)
- La liste est **groupée par rayons** pour suivre le parcours du magasin
- **Copier la liste** : la liste complète en texte brut (à coller dans un message, par ex.)

### Ajouter un article à la main
**+ Nouvel article** : tape le début du nom — les **suggestions du catalogue** apparaissent (nom + rayon) ; en choisissant une suggestion, le rayon et l'unité sont repris automatiquement. Tu peux aussi saisir un nom libre.

### Purger la liste
Bouton **Purger** : avec confirmation obligatoire. Par défaut, seuls les **articles achetés** sont supprimés (fin de courses — ce qui reste à acheter est conservé) ; l'option « toute la liste » repart de zéro.

---

## 📊 Statistiques (/stats)

La page **Stats** (barre de navigation) donne un aperçu de vos habitudes :
- **Utilisation du catalogue** : combien de vos recettes ont déjà été cuisinées au moins une fois, et lesquelles n'ont jamais été planifiées (des idées à ressortir !)
- **Recettes les plus cuisinées** : votre top 10 — et les valeurs sûres de la maison
- **Répartition par type de plat** : équilibre entrées/plats/desserts dans votre planning
- **Repas par mois** : le volume de planification mois par mois

Les statistiques portent sur **tous les repas planifiés, y compris passés** — c'est l'intérêt de figer l'historique.

---

## 🔗 Partager le planning (/share — ADMIN)

1. Crée un **jeton** (durée 7/30/90 jours) — deux types : « Calendrier » (page publique à partager) ou « API » (Home Assistant)
2. **Copie immédiatement** les liens affichés : ils ne seront plus jamais montrés (les jetons sont stockés hachés)
3. Page publique : consultable sans compte, en lecture seule, J → J+30
4. **ICS** : abonnement dans Google Agenda / Calendar (« À partir du lien »)
5. **Révoquer** un jeton le désactive immédiatement

---

## ⚙️ Paramètres (/settings)

- ADMIN : **couverts par défaut** (pré-remplit le champ du planning)
- Chacun : **Mes préférences** → intervalle antidoublon (une même recette ne peut pas être replanifiée à moins de X jours — 0 = désactivé)
- **Palette de couleurs** (ADMIN) : 5 thèmes — teal, indigo, rose, ambre, vert forêt. Chaque aperçu montre les étiquettes du calendrier. La palette teinte boutons, liens et étiquettes, en mode clair comme sombre
- Thème clair/sombre : bascule dans la barre de navigation
- ADMIN : liens vers Utilisateurs (créer/valider/promouvoir des comptes), Partage, et Update

---

## 🔄 Mises à jour (/deploy — ADMIN)

- **Version chargée** : commit et date du build en service
- **Mise à jour depuis GitHub** : télécharge la dernière version de la branche suivie par ce serveur, avec **sauvegarde automatique de la base** avant tout et healthcheck après
- **Retour arrière** : restaure la dernière sauvegarde de la base
- Le journal se déroule en direct — patiente jusqu'à « terminée »

---

## 🔐 Comptes

- **ADMIN** : tout + gestion des comptes, des jetons, des paramètres globaux
- **MEMBER** : recettes, planning, courses, ses préférences
- **GUEST** : compte en attente de validation par un ADMIN (aucun accès tant que non validé)
- Mot de passe oublié : « Mot de passe oublié ? » → question secrète (définie dans ton Profil)

---

## ❓ Questions fréquentes

**L'icône ne change pas sur mon téléphone.** Voir le début du manuel — iOS exige une réinstallation, Android se met à jour seul en 1-2 jours.

**Pourquoi les barres de l'application ne suivent pas ma palette de couleurs ?** Contrainte Android : les couleurs du splash et des barres sont figées au moment de l'INSTALLATION de la PWA — elles ne peuvent pas suivre un réglage modifiable. Elles sont donc neutres par design : splash et barre inférieure noir profond, barre supérieure suivant le mode clair/sombre de ton SYSTÈME. Seule l'interface dans l'application suit la palette choisie.

**Le splash est noir alors que mon téléphone est en mode clair.** Le manifest ne permet qu'une valeur de fond unique — le noir profond a été retenu (usage principal en mode sombre, cohérent avec l'icône). La barre supérieure, elle, suit bien le mode système.

**Je ne trouve pas un ingrédient dans le catalogue.** L'administrateur peut enrichir le catalogue d'un coup : `npm run db:seed-ingredients` ajoute 568 ingrédients courants sans jamais modifier les données existantes. Et tu peux toujours créer un ingrédient à la volée depuis le formulaire de recette (« + Nouveau »).

**Je ne trouve pas une recette dans le sélecteur du planning.** La recherche filtre au fur et à mesure de la saisie et ignore les accents : « poulet roti » trouve « Poulet rôti ». Maximum 30 résultats affichés — affinis ta recherche.

**Je ne peux pas supprimer un repas d'hier.** Normal : les repas passés sont figés pour que l'historique reste fiable.

**Le badge « • » ne disparaît pas.** Il indique « servi dans les 30 derniers jours » et se mettra à jour à la prochaine planification de cette recette (ou disparaîtra au fil du temps).
