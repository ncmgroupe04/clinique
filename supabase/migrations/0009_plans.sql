-- 0009 : plans d'abonnement (formules) pour le SaaS
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monthly_price integer not null default 0,
  registration_fee integer not null default 0,
  duration_days integer not null default 30,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed de la formule unique partagée
insert into public.subscription_plans (name, monthly_price, registration_fee, duration_days)
select 'Standard', 25000, 50000, 30
where not exists (select 1 from public.subscription_plans where name = 'Standard');

-- Lier les structures à un plan
alter table public.structures
  add column if not exists plan_id uuid references public.subscription_plans(id);

-- Backfill: rattacher les structures existantes au plan Standard
update public.structures
  set plan_id = (select id from public.subscription_plans where name = 'Standard' limit 1)
  where plan_id is null;