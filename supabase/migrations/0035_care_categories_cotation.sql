-- 0035 : catégories de soins personnalisables par structure + cotation des lignes d'ordonnance.

-- ---------------------------------------------------------------------------
-- Catégories de soins (une liste dédiée, à l'image des autres listes).
-- La valeur stockée dans cares.category est le slug de la catégorie, ce qui
-- préserve les soins existants (« diagnostic », « intervention », « produit »).
-- ---------------------------------------------------------------------------
create table if not exists public.care_categories (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  slug         text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint care_categories_name_uniq unique (structure_id, slug)
);
create index care_categories_structure_idx on public.care_categories (structure_id);

alter table public.cares
  add column if not exists category text;

alter table public.care_categories enable row level security;
alter table public.care_categories force row level security;

drop policy if exists care_categories_select on public.care_categories;
create policy care_categories_select on public.care_categories for select to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'platform_admin')
  );

drop policy if exists care_categories_insert on public.care_categories;
create policy care_categories_insert on public.care_categories for insert to authenticated
  with check (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'platform_admin')
  );

drop policy if exists care_categories_update on public.care_categories;
create policy care_categories_update on public.care_categories for update to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'platform_admin')
  )
  with check (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'platform_admin')
  );

drop policy if exists care_categories_delete on public.care_categories;
create policy care_categories_delete on public.care_categories for delete to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'platform_admin')
  );

grant select, insert, update, delete on public.care_categories to authenticated;
grant select, insert, update on public.cares to authenticated;

-- Catégories par défaut pour les structures existantes.
insert into public.care_categories (structure_id, name, slug)
select s.id, v.name, v.slug
from public.structures s
cross join (values
  ('Diagnostic'::text, 'diagnostic'::text),
  ('Intervention'::text, 'intervention'::text),
  ('Produit'::text, 'produit'::text),
  ('Dentiste'::text, 'dentiste'::text)
) as v(name, slug)
on conflict (structure_id, slug) do nothing;

-- Catégories par défaut pour toute nouvelle structure.
create or replace function public.seed_care_categories()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.care_categories (structure_id, name, slug)
  values
    (new.id, 'Diagnostic', 'diagnostic'),
    (new.id, 'Intervention', 'intervention'),
    (new.id, 'Produit', 'produit'),
    (new.id, 'Dentiste', 'dentiste')
  on conflict (structure_id, slug) do nothing;
  return new;
end $$;

drop trigger if exists structures_seed_care_categories on public.structures;
create trigger structures_seed_care_categories
  after insert on public.structures
  for each row execute function public.seed_care_categories();

-- ---------------------------------------------------------------------------
-- Cotation : code alphanumérique (ex. HBJD001) sur chaque ligne d'ordonnance.
-- ---------------------------------------------------------------------------
alter table public.prescription_items
  add column if not exists cotation text
  check (cotation is null or char_length(btrim(cotation)) between 1 and 50);

grant insert (prescription_id, medication_id, label, posology, duration_days, quantity, sort_order, cotation) on public.prescription_items to authenticated;
grant update (posology, duration_days, quantity, sort_order, cotation) on public.prescription_items to authenticated;

create or replace function public.create_prescription(
  p_patient_name text,
  p_patient_age  text,
  p_items        jsonb
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_prescription_id uuid;
  v_item jsonb;
  v_cotation text;
  v_order integer := 0;
begin
  if v_role is null or v_role not in ('structure_admin','docteur') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_patient_name is null or char_length(btrim(p_patient_name)) = 0 then
    raise exception 'Nom du patient requis' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Au moins une ligne requise' using errcode = '22023';
  end if;

  insert into public.prescriptions (structure_id, patient_name, patient_age, doctor_id)
  values (v_structure, btrim(p_patient_name), nullif(btrim(coalesce(p_patient_age,'')),''), auth.uid())
  returning id into v_prescription_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_order := v_order + 1;
    v_cotation := nullif(btrim(coalesce(v_item->>'cotation','')),'');
    if v_cotation is not null and v_cotation !~ '^[A-Za-z0-9][A-Za-z0-9 -]*$' then
      raise exception 'Cotation invalide (lettres et chiffres uniquement)' using errcode = '22023';
    end if;
    insert into public.prescription_items (prescription_id, medication_id, label, posology, duration_days, quantity, sort_order, cotation)
    values (
      v_prescription_id,
      nullif(v_item->>'medication_id','')::uuid,
      btrim(v_item->>'label'),
      btrim(v_item->>'posology'),
      nullif(v_item->>'duration_days','')::integer,
      nullif(v_item->>'quantity','')::integer,
      coalesce((v_item->>'sort_order')::integer, v_order),
      v_cotation
    );
  end loop;

  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'prescription_create', v_prescription_id);

  return v_prescription_id;
end $$;

grant execute on function public.create_prescription(text, text, jsonb) to authenticated;
