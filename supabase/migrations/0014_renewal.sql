-- 0014 : demande de renouvellement d'abonnement
alter table public.structures
  add column if not exists renewal_requested boolean not null default false,
  add column if not exists renewal_reference text;

grant update (renewal_requested, renewal_reference) on public.structures to service_role;