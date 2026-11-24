-- 0008 : frais d'inscription (50 000 F) pour les abonnés
alter table public.structures
  add column if not exists registration_fee_paid boolean not null default false;