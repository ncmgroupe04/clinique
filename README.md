# Tickets de caisse — structures de santé (multi-tenant)

Application web SaaS (Next.js + Supabase) permettant à chaque structure de santé
(clinique, hôpital, pharmacie) de gérer ses tickets de caisse, ses factures et son
abonnement. Interface 100 % en français, montants en F CFA entiers.

## Modules

| Module | Routes | Rôles |
|---|---|---|
| Tableau de bord | `/tableau` | Structure |
| Tickets (2 étapes, thermique 80/58 mm, A6) | `/tickets`, `/tickets/nouveau` |structure_admin, cashier |
| Factures (soins, multi-lignes, A4) | `/factures` | structure_admin, cashier |
| Soins et prix | `/soins` | structure_admin |
| Tarifs et format d'impression | `/tarifs` | structure_admin |
| Utilisateurs | `/utilisateurs` | structure_admin |
| Réglages · En-tête | `/reglages` | structure_admin |
| Abonnement (Wave, renouvellement) | `/abonnement` | structure_admin |
| Ordonnances (bientôt) | `/ordonnances` | structure_admin, docteur |
| Super Admin (abonnés, formules, inscriptions, structures) | `/admin` | platform_admin |

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase : PostgreSQL, Auth, Row Level Security (région Europe)
- Déploiement : Vercel
- Tests : Vitest + PGlite, Playwright

## Installation locale

### Prérequis

- Node.js 20+
- Docker Desktop (pour Supabase local)
- (Optionnel) GitHub CLI, Vercel CLI, Supabase CLI (installés en devDependencies)

### Étapes

```bash
# 1. Installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.example .env.local
# puis renseigner les valeurs (voir section Variables d'environnement)

# 3. Démarrer Supabase local
npx supabase start
# Les clés sont affichées à la fin : copier API_URL, ANON_KEY, SERVICE_ROLE_KEY dans .env.local

# 4. Appliquer les migrations
npx supabase migration up

# 5. Lancer l'application
npm run dev
# → http://localhost:3000
```

### Variables d'environnement

Voir `.env.example`. Trois variables sont requises :

- `NEXT_PUBLIC_SUPABASE_URL` : URL du projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique (anon)
- `SUPABASE_SERVICE_ROLE_KEY` : clé secrète (serveur uniquement, jamais côté navigateur)

⚠️ `.env`, `.env.local` et tout `.env*` (sauf `.env.example`) sont ignorés par Git.
Ne jamais committer de clé ni de mot de passe.

### Comptes de test

Les tests e2e créent leurs propres comptes. Pour un compte Super Admin local :

1. Créer un compte via `/inscription`.
2. Promouvoir le profil en base :
   ```sql
   UPDATE public.profiles
   SET role = 'platform_admin', structure_id = NULL
   WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@exemple.sn');
   ```
3. Se reconnecter : le tableau de bord Super Admin (`/admin`) s'affiche.

### Tests

```bash
# Tests unitaires / logique (Vitest + PGlite)
npx vitest run

# Tests de parcours (Playwright)
npx playwright test

# Build de production
npm run build
```

## Déploiement

### 1. Supabase (région Europe)

1. Créer un projet sur https://supabase.com (région Europe).
2. Noter l'URL du projet et les clés `anon` et `service_role`.
3. Lier le projet local :
   ```bash
   npx supabase link --project-ref <PROJECT_REF>
   ```
4. Pousser **toutes** les migrations (0001 → 0014) :
   ```bash
   npx supabase db push
   ```
   Migrations notables : abonnements/formules (0005, 0009), factures (0010),
   anti force brute (0013), renouvellement (0014).

5. Vérifier que RLS est active sur toutes les tables métier.

### 2. GitHub

Aucun remote n'est encore configuré dans ce dépôt. Ajouter le remote puis pousser :

```bash
git remote add origin https://github.com/<UTILISATEUR>/<DEPOT>.git
git push -u origin master
```

⚠️ L'historique git a été nettoyé (anciens identifiants de test supprimés). Si le
dépôt distant existait déjà, il faudrait un `git push --force-with-lease`.

### 3. Vercel

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

Ou importer le dépôt sur https://vercel.com et renseigner les variables
d'environnement :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Vérifications post-déploiement

- [ ] Aucun secret dans le dépôt.
- [ ] RLS active sur toutes les tables.
- [ ] Deux structures de test ne voient pas les données l'une de l'autre.
- [ ] Paiement Wave testé et validé depuis `/admin/inscriptions`.
- [ ] Impression vérifiée sur une imprimante thermique réelle (58 et 80 mm) et A6.
- [ ] Essai de 7 jours et suspension automatique vérifiés.

## Roadmap (évolutions prévues, hors V1)

Le détail est dans le cahier des charges, section 13. Ces deux sujets sont
**anticipés mais non développés** ; ils ont été cadrés avant la production pour ne
pas bloquer les choix d'architecture actuels (multi-tenant, devise, langue).

- **Mode hors ligne** : file locale IndexedDB, numéros temporaires `TEMP-…`
  réattribués côté serveur à la reconnexion, mention « À régulariser » sur le ticket
  imprimé hors ligne. Critère : 10 tickets hors ligne synchronisés sans trou ni doublon.
- **Extension vers la sous-région** : table `countries`, devise et langue par
  structure, mentions légales adaptées par pays, numérotation toujours par structure.
  Critère : deux structures de pays différents avec devises distinctes sans mélange.

## Sécurité

- Isolation multi-tenant par `structure_id` + Row Level Security **forcée sur toutes les tables**.
- Rôle `anon` **fermé** : aucune table lisible, aucune fonction exécutable, aucun schéma `app` accessible.
- Fonctions `SECURITY DEFINER` déplacées dans le schéma interne `app` ; le schéma exposé
  `public` ne contient que des wrappers `SECURITY INVOKER` sans privilège.
- Par défaut (droits supprimés aussi pour les futures tables), aucun accès anonyme à la BD.
- Aucune clé `service_role` côté navigateur.
- Politique de mot de passe : **12 caractères minimum**, majuscule, minuscule, chiffre et symbole.
- Rotation des tokens de rafraîchissement et changement d'e-mail sécurisé activés.
- **À faire après passage au plan Supabase Pro** : activer « Leaked password protection »
  (HaveIBeenPwned) dans *Authentication → Providers → Email*. Indisponible sur le plan Free.
- Anti force brute : 5 tentatives de connexion par minute et par e-mail.
- Pas de suppression de ticket (annulation avec motif, restauration possible).
- Prix copié sur le ticket/facture à la création.
- Calculs en entiers (F CFA).
- Numéros attribués côté serveur, sans trou ni doublon (`Reçu 2026-0001`).

## Licence

Projet privé.
"# clinique" 
