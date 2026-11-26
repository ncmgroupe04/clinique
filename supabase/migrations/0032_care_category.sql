-- 0025 : catégorie des soins (Diagnostics / Interventions / Produits)
-- Permet d'afficher le catalogue sous forme de listes à cocher groupées
-- sur l'écran « Nouvelle facture ».

alter table public.cares
  add column if not exists category text not null default 'intervention'
  check (category in ('diagnostic', 'intervention', 'produit'));

grant update (category) on public.cares to authenticated;
