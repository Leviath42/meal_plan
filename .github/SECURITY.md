# Politique de sécurité

## Versions prises en charge

| Branche | Prise en charge |
|---|---|
| `main` (tag `last-stable`) | ✅ correctifs de sécurité |
| `beta` | ✅ correctifs de sécurité |

Projet solo : seule la dernière version reçoit des correctifs.

## Signaler une vulnérabilité

1. **En privé via GitHub** : onglet *Security* → *Report a vulnerability* (signalement privé activé). Méthode préférée — merci de ne pas ouvrir d'issue publique pour une faille.
2. À défaut : contact via le profil GitHub du propriétaire.

Merci d'inclure : étapes de reproduction, impact estimé, version/branche concernée, correctif éventuel.

- Délai de réponse visé : **7 jours** ; correctif selon la gravité.
- Divulgation responsable : pas d'exploitation d'un service en production, pas de déni de service, pas d'accès à des données d'utilisateurs réels.

## Périmètre

- ✅ Code applicatif (`app/`, `lib/`, `scripts/`, `proxy.ts`, `update.sh`), configuration serveur et déploiement.
- ❌ Hors périmètre : vulnérabilités de dépendances (suivies par Dependabot — les signaler à la bibliothèque amont), spam, ingénierie sociale, attaques contre l'infrastructure privée du propriétaire.

*Créé le 24 oct. 2026 dans le cadre de l'audit « socle commercial » (voir docs/roadmap.md, section Conformité).*
