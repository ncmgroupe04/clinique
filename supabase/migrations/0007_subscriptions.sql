-- 0007 : abonnements SaaS pour les structures
alter table public.structures
  add column if not exists plan text not null default 'essai',
  add column if not exists subscription_ends_at timestamptz,
  add column if not exists suspended boolean not null default false;

-- Backfill: structures existantes -> essai de 30 jours
update public.structures
  set subscription_ends_at = created_at + interval '30 days'
  where subscription_ends_at is null;