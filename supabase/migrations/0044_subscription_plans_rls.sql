-- 0044 : corrige le trou de sécurité : RLS réellement activée sur subscription_plans.
-- Sans ENABLE, le FORCE ne fait rien et tout utilisateur authentifié peut modifier les plans.
alter table public.subscription_plans enable row level security;
alter table public.subscription_plans force row level security;

-- Aucune policy : aucune lecture/écriture côté client. L'application serveur
-- (service_role) contourne la RLS et public-plans.ts lit via service_role.
revoke all on public.subscription_plans from anon, authenticated;
