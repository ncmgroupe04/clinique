-- 0017 : fonctionnalités par formule + quota Essentiel 750
alter table public.subscription_plans
  add column if not exists features text[] not null default '{}'::text[];

grant update (features) on public.subscription_plans to service_role;

update public.subscription_plans set max_documents_per_month = 750 where name = 'Essentiel';
update public.subscription_plans set max_documents_per_month = 2500 where name = 'Standard';
update public.subscription_plans set max_documents_per_month = null where name in ('Pro', 'Formule Ami');

update public.subscription_plans
set features = case name
  when 'Essentiel' then array['tickets','factures','soins','historique','impression_thermique','reglages','abonnement']
  when 'Standard' then array['tickets','factures','soins','tarifs','historique','impression_thermique','impression_a6','reglages','abonnement']
  when 'Pro' then array['tickets','factures','soins','tarifs','historique','impression_thermique','impression_a6','utilisateurs','reglages','abonnement']
  when 'Formule Ami' then array['tickets','factures','soins','tarifs','historique','impression_thermique','impression_a6','utilisateurs','reglages','abonnement']
  else features
end
where name in ('Essentiel','Standard','Pro','Formule Ami');