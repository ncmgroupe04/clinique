# CLAUDE.md — Plateforme de tickets pour structures de santé (multi-tenant)

Lis d'abord `CAHIER-DES-CHARGES.md`. Ce fichier donne les règles de travail permanentes.

## Contexte
Application web en ligne pour cliniques, hôpitaux et pharmacies du Sénégal (Touba). Chaque structure (« tenant ») ouvre son compte et gère ses propres tickets de caisse. Les modules Ticket et Ordonnancier sont à développer. Le module Ordonnancier est désormais actif : il peut être codé, avec les mêmes règles multi-tenant et RLS que le module Ticket.

## Stack imposée
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase : PostgreSQL, Auth, Row Level Security (région Europe)
- Déploiement : Vercel
- Interface 100 % en français, monnaie F CFA (séparateur de milliers : espace), dates au format JJ/MM/AAAA

## Règles non négociables
1. **Isolation multi-tenant** : chaque table métier a une colonne `structure_id`. Row Level Security activée partout. Un utilisateur ne voit jamais les données d'une autre structure. Écrire des tests qui le prouvent.
2. Aucune clé secrète (`service_role`) côté navigateur. Aucun secret dans le dépôt (utiliser `.env.local`, fournir `.env.example`).
3. **Pas de suppression de ticket** : un ticket s'annule (statut `annule` + motif). Traçabilité financière.
4. Le prix d'un service est **copié sur le ticket** à la création : changer un tarif ne modifie jamais les anciens tickets.
5. Calculs d'argent en entiers (F CFA, pas de décimales). Le reste = total − avance, calculé aussi côté base.
6. Numéro de reçu attribué côté serveur (transaction, compteur par structure et par année), jamais côté client, sans trou ni doublon. Format affiché `Reçu 2026-001`, remise à 001 chaque année. Stocker `annee` et `numero` séparément (index unique `structure_id, annee, numero`) pour les filtres.
7. Les données de santé/identité sont sensibles : minimiser les données, journaliser les accès sensibles, pas d'analytics tiers.

## Conventions
- Composants et fonctions petits, noms en anglais dans le code, textes d'interface en français.
- Migrations SQL versionnées dans `supabase/migrations/`.
- Validation des formulaires avec Zod.
- Tests : Vitest (logique) + Playwright (parcours : inscription, création ticket, impression, isolation entre deux structures).
- Interface utilisable à la souris et au clavier, gros éléments tactiles (secrétaire pressée).

## Impression thermique
Papier **80 mm par défaut** (zone imprimable 72 mm), option **58 mm** (zone 48 mm). `@page { size: 80mm auto; margin: 0 }`, marge interne 2 à 3 mm, noir sur blanc, police sans empattement 12 à 13 px, hauteur continue. Largeur choisie dans les réglages de la structure. Voir le détail dans `CAHIER-DES-CHARGES.md` section 8.

## Fidélité à la maquette
Lis `DESIGN-SPEC.md` et ouvre les fichiers de `maquette/`. Reproduis les écrans **à l'identique** (couleurs, tailles, rayons, espacements, textes), puis fais le contrôle de fidélité décrit dans ce fichier. Ne code pas `maquette/ordonnancier-module-2.html` maintenant.

## Design
Style clair et moderne : vert pharmacie `#0B7A6B` (accent), texte `#0B1F2A`, fond `#EEF3F6`, cartes blanches très arrondies, police Plus Jakarta Sans. Maquette de référence : https://claude.ai/artifact/B6vE6A1gF28bVFzfvgMzvC (écrans Ticket financier et Réglages · En-tête).

## Ordre de travail
1. Projet + Supabase + migrations + RLS + tests d'isolation
2. Inscription d'une structure et connexion, rôles
3. Réglages : en-tête, format du papier
4. Tarifs : écran Réglages › Tarifs avec bouton « Ajouter un service », modification, désactivation
5. Création de ticket en deux étapes : étape 1 cartes de services (le « + » de la barre latérale = Nouveau ticket), étape 2 patient et paiement + calculs
6. Impression thermique (aperçu 58/80 mm)
7. Historique, total du jour, annulation
8. Tests, déploiement, documentation d'installation
Avance étape par étape : à la fin de chaque étape, lance les tests et résume ce qui reste.

## Définition de « terminé »
Tests verts, aucune donnée visible entre structures, impression vérifiée sur une imprimante thermique réelle, README d'installation à jour.
