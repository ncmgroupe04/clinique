-- 0021 : journal d'audit enrichi (détails de chaque action, sans secret).
alter table public.audit_log
  add column if not exists details jsonb not null default '{}'::jsonb;

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- Aucun droit d'écriture supplémentaire : seules les fonctions/le service_role écrivent.
-- lecture : admin de structure (policy existante) et Super Admin via service_role.
