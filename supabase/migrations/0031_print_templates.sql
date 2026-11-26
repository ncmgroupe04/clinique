-- 0031 : modèles de textes imprimés par type de document
-- Un modèle par structure et par type (ticket, facture, ordonnance).

create table if not exists public.print_templates (
  structure_id uuid not null references public.structures(id),
  kind text not null check (kind in ('ticket','facture','ordonnance')),
  header_text text check (char_length(header_text) <= 500),
  footer_text text check (char_length(footer_text) <= 500),
  updated_at timestamptz not null default now(),
  primary key (structure_id, kind)
);

alter table public.print_templates enable row level security;
alter table public.print_templates force row level security;

drop policy if exists print_templates_select on public.print_templates;
create policy print_templates_select on public.print_templates for select to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() = 'structure_admin'
  );

drop policy if exists print_templates_insert on public.print_templates;
create policy print_templates_insert on public.print_templates for insert to authenticated
  with check (
    structure_id = app.user_structure_id()
    and app.user_role() = 'structure_admin'
  );

drop policy if exists print_templates_update on public.print_templates;
create policy print_templates_update on public.print_templates for update to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() = 'structure_admin'
  )
  with check (
    structure_id = app.user_structure_id()
    and app.user_role() = 'structure_admin'
  );

grant select, insert, update on public.print_templates to authenticated;

-- Valeurs par défaut pour les structures existantes (idempotent).
insert into public.print_templates (structure_id, kind, header_text, footer_text)
select s.id, v.kind, v.header_text, v.footer_text
from public.structures s
cross join (values
  ('ticket'::text, 'Merci de votre visite'::text, 'Cachet'::text),
  ('facture'::text, 'Facture'::text, 'Merci de votre confiance'::text),
  ('ordonnance'::text, 'ORDONNANCE'::text, 'Veuillez rapporter l’ordonnance au prochain rendez-vous !!!'::text)
) as v(kind, header_text, footer_text)
on conflict (structure_id, kind) do nothing;
