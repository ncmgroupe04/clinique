-- 0015 : 4 formules with user limits and private "Ami" plan
alter table public.subscription_plans
  add column if not exists max_cashiers integer,
  add column if not exists max_docteurs integer,
  add column if not exists is_unlimited boolean not null default false,
  add column if not exists is_public boolean not null default true;

grant update (max_cashiers, max_docteurs, is_unlimited, is_public) on public.subscription_plans to service_role;

-- Normalize existing plans to the new catalog
update public.subscription_plans
set name = 'Standard',
    monthly_price = 25000,
    registration_fee = 50000,
    duration_days = 30,
    max_cashiers = 3,
    max_docteurs = 2,
    is_unlimited = false,
    is_public = true,
    active = true
where name = 'Standard';

update public.subscription_plans
set active = false, is_public = false
where name not in ('Standard', 'Essentiel', 'Pro', 'Formule Ami');

insert into public.subscription_plans
  (name, monthly_price, registration_fee, duration_days, max_cashiers, max_docteurs, is_unlimited, is_public, active)
select 'Essentiel', 15000, 50000, 30, 1, 1, false, true, true
where not exists (select 1 from public.subscription_plans where name = 'Essentiel');

insert into public.subscription_plans
  (name, monthly_price, registration_fee, duration_days, max_cashiers, max_docteurs, is_unlimited, is_public, active)
select 'Pro', 45000, 50000, 30, null, null, true, true, true
where not exists (select 1 from public.subscription_plans where name = 'Pro');

insert into public.subscription_plans
  (name, monthly_price, registration_fee, duration_days, max_cashiers, max_docteurs, is_unlimited, is_public, active)
select 'Formule Ami', 0, 50000, 30, null, null, true, false, true
where not exists (select 1 from public.subscription_plans where name = 'Formule Ami');