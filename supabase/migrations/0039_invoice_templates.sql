-- 0039 : modèles de facture multiples par structure + colonnes configurables.

create table if not exists public.invoice_templates (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  settings     jsonb not null default '{}'::jsonb,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index invoice_templates_structure_idx on public.invoice_templates (structure_id);

create unique index if not exists invoice_templates_default_uniq
  on public.invoice_templates (structure_id)
  where is_default;

alter table public.invoice_templates enable row level security;
alter table public.invoice_templates force row level security;

drop policy if exists invoice_templates_select on public.invoice_templates;
create policy invoice_templates_select on public.invoice_templates for select to authenticated
  using (structure_id = app.user_structure_id() and app.user_role() in ('structure_admin','platform_admin'));

drop policy if exists invoice_templates_insert on public.invoice_templates;
create policy invoice_templates_insert on public.invoice_templates for insert to authenticated
  with check (structure_id = app.user_structure_id() and app.user_role() in ('structure_admin','platform_admin'));

drop policy if exists invoice_templates_update on public.invoice_templates;
create policy invoice_templates_update on public.invoice_templates for update to authenticated
  using (structure_id = app.user_structure_id() and app.user_role() in ('structure_admin','platform_admin'))
  with check (structure_id = app.user_structure_id() and app.user_role() in ('structure_admin','platform_admin'));

drop policy if exists invoice_templates_delete on public.invoice_templates;
create policy invoice_templates_delete on public.invoice_templates for delete to authenticated
  using (structure_id = app.user_structure_id() and app.user_role() in ('structure_admin','platform_admin'));

grant select, insert, update, delete on public.invoice_templates to authenticated;

-- Ligne de facture : dents (facultatif, ex. 14).
alter table public.invoice_items
  add column if not exists dents text
  check (dents is null or char_length(btrim(dents)) between 1 and 30);

alter table public.invoices
  add column if not exists template_id uuid references public.invoice_templates (id);

-- Modèle initial pour les structures existantes.
insert into public.invoice_templates (structure_id, name, settings, is_default)
select s.id, 'Modèle par défaut',
  jsonb_build_object(
    'title', 'Facture',
    'number_prefix', '',
    'show_date', true,
    'show_indice', true,
    'show_quantity', true,
    'show_unit_price', true,
    'show_discount', true,
    'show_advance', true,
    'show_stamp', true,
    'merge_rows', false,
    'columns', jsonb_build_array(
      jsonb_build_object('key','patient','label','Patients','source','patient','visible',true,'span',1),
      jsonb_build_object('key','date','label','Date','source','date','visible',true,'span',1),
      jsonb_build_object('key','dents','label','Dents','source','dents','visible',false,'span',1),
      jsonb_build_object('key','actes','label','Actes','source','label','visible',true,'span',1),
      jsonb_build_object('key','indice','label','Indice','source','cotation','visible',true,'span',1),
      jsonb_build_object('key','montant','label','Montant','source','total','visible',true,'span',1)
    )
  ),
  true
from public.structures s
where not exists (select 1 from public.invoice_templates t where t.structure_id = s.id);
