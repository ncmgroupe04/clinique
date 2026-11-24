-- 0018 : durcissement de sécurité (moindre privilège + RLS forcé partout)
-- Aucun objet métier ne doit être accessible sans session utilisateur :
-- les écritures passent par les fonctions SECURITY DEFINER autorisées,
-- les lectures par les policies, et l'administration par le service_role côté serveur.

-- 1. Fermeture du rôle anon (et du pseudo-rôle PUBLIC) sur tous les objets existants.
revoke all on all tables in schema public from anon, public;
revoke all on all functions in schema public from anon, public;
revoke all on all functions in schema app from anon, public;
revoke all on schema public from anon;

-- 2. Les objets créés ultérieurement par postgres ne doivent pas être exposés à anon.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema app revoke all on functions from anon;

-- 3. RLS forcé sur TOUTES les tables (y compris subscription_plans qui ne l'était pas).
alter table public.structures          force row level security;
alter table public.profiles            force row level security;
alter table public.services            force row level security;
alter table public.ticket_counters     force row level security;
alter table public.tickets             force row level security;
alter table public.audit_log           force row level security;
alter table public.cares               force row level security;
alter table public.invoices            force row level security;
alter table public.invoice_items       force row level security;
alter table public.invoice_counters    force row level security;
alter table public.login_attempts      force row level security;
alter table public.subscription_plans  force row level security;

-- 4. Défense en profondeur : les fonctions de facturation ne doivent jamais
--    être appelables sans authentification, même si un grant réapparaît.
revoke execute on function public.create_invoice(text, jsonb, integer, integer) from anon;
revoke execute on function public.cancel_invoice(uuid, text) from anon;
revoke execute on function public.register_invoice_print(uuid) from anon;
