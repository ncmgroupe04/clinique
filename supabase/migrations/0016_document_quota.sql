-- 0016 : quota mensuel de documents par formule
alter table public.subscription_plans
  add column if not exists max_documents_per_month integer;

grant update (max_documents_per_month) on public.subscription_plans to service_role;

update public.subscription_plans set max_documents_per_month = 500 where name = 'Essentiel';
update public.subscription_plans set max_documents_per_month = 1500 where name = 'Standard';
update public.subscription_plans set max_documents_per_month = null where name in ('Pro', 'Formule Ami');