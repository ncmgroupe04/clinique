# Tickets de caisse — structures de santé (multi-tenant)

Application web (Next.js + Supabase) permettant à chaque structure de santé
(clinique, hôpital, pharmacie) de gérer ses propres tickets de caisse thermiques.
Seul le module **Ticket** est développé (le module Ordonnancier est reporté).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase : PostgreSQL, Auth, Row Level Security (région Europe)
- Déploiement : Vercel
- Interface 100 % en français, monnaie F CFA

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

### Tests

```bash
# Tests unitaires / logique (Vitest + PGlite)
npm test

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
4. Pousser les migrations :
   ```bash
   npx supabase db push
   ```

### 2. Vercel

1. Pousser le code sur GitHub.
2. Importer le dépôt sur https://vercel.com.
3. Renseigner les variables d'environnement dans Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Déployer.

### 3. Vérifications post-déploiement

- [ ] Aucun secret dans le dépôt (scan gitleaks).
- [ ] RLS active sur toutes les tables.
- [ ] Deux structures de test ne voient pas les données l'une de l'autre.
- [ ] Impression vérifiée sur une imprimante thermique réelle (58 et 80 mm).
- [ ] README à jour.

## Sécurité

- Isolation multi-tenant par `structure_id` + Row Level Security.
- Aucune clé `service_role` côté navigateur.
- Pas de suppression de ticket (annulation avec motif).
- Prix copié sur le ticket à la création.
- Calculs en entiers (F CFA).
- Numéro de reçu attribué côté serveur.

## Licence

Projet privé.