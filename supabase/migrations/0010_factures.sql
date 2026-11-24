-- 0010 : module Facture (soins + factures multi-lignes)
create table public.cares (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures (id),
  name         text not null check (char_length(name) between 1 and 200),
  price        integer not null check (price >= 0),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index cares_structure_idx on public.cares (structure_id);

create table public.invoice_counters (
  structure_id uuid not null references public.structures (id),
  year         integer not null,
  last_number  integer not null default 0 check (last_number >= 0),
  primary key (structure_id, year)
);

create table public.invoices (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures (id),
  year         integer not null,
  number       integer not null check (number > 0),
  patient_name text not null check (char_length(patient_name) between 1 and 200),
  subtotal     integer not null check (subtotal >= 0),
  discount     integer not null default 0 check (discount >= 0),
  total        integer not null check (total >= 0),
  advance      integer not null default 0 check (advance >= 0),
  remaining    integer generated always as (total - advance) stored,
  status       text not null default 'actif' check (status in ('actif', 'annule')),
  cancel_reason text,
  print_count  integer not null default 0 check (print_count >= 0),
  created_by   uuid not null references public.profiles (id),
  created_at   timestamptz not null default now(),
  constraint invoices_advance_chk check (advance >= 0 and advance <= total),
  constraint invoices_discount_chk check (discount <= subtotal),
  constraint invoices_cancel_chk check (
    (status = 'annule' and cancel_reason is not null and char_length(btrim(cancel_reason)) >= 3)
    or (status = 'actif')
  ),
  constraint invoices_number_uniq unique (structure_id, year, number)
);
create index invoices_structure_created_idx on public.invoices (structure_id, created_at desc);

create table public.invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices (id) on delete cascade,
  care_name    text not null,
  quantity     integer not null check (quantity between 1 and 1000),
  unit_price   integer not null check (unit_price >= 0),
  line_total   integer not null check (line_total >= 0)
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id);

-- block delete
create trigger invoices_no_delete before delete on public.invoices
  for each row execute function app.block_delete();
create trigger invoice_items_no_delete before delete on public.invoice_items
  for each row execute function app.block_delete();

-- RLS
alter table public.cares enable row level security;
alter table public.cares force row level security;
alter table public.invoices enable row level security;
alter table public.invoices force row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_items force row level security;
alter table public.invoice_counters enable row level security;
alter table public.invoice_counters force row level security;

create policy cares_select on public.cares for select to authenticated
  using (structure_id = app.user_structure_id());
create policy cares_insert on public.cares for insert to authenticated
  with check (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id());
create policy cares_update on public.cares for update to authenticated
  using (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id())
  with check (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id());

create policy invoices_select on public.invoices for select to authenticated
  using (structure_id = app.user_structure_id());
create policy invoice_items_select on public.invoice_items for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and i.structure_id = app.user_structure_id()));

-- privileges
grant select on public.cares, public.invoices, public.invoice_items to authenticated;
grant insert (structure_id, name, price) on public.cares to authenticated;
grant update (name, price, active) on public.cares to authenticated;
-- invoices / items : écriture via fonctions uniquement

-- function: create invoice
create function public.create_invoice(
  p_patient_name text,
  p_items jsonb,
  p_discount integer default 0,
  p_advance integer default 0
) returns public.invoices
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_year integer := extract(year from now())::integer;
  v_number integer;
  v_invoice public.invoices;
  v_item jsonb;
  v_care public.cares;
  v_subtotal integer := 0;
  v_total integer;
begin
  if v_role is null or v_role not in ('structure_admin', 'cashier') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_patient_name is null or char_length(btrim(p_patient_name)) = 0 then
    raise exception 'Nom du patient requis' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Au moins un soin requis' using errcode = '22023';
  end if;

  -- compute subtotal
  for v_item in select * from jsonb_array_elements(p_items) loop
    if (v_item->>'care_id') is not null then
      select * into v_care from public.cares
       where id = (v_item->>'care_id')::uuid and structure_id = v_structure and active;
      if not found then
        raise exception 'Soin introuvable' using errcode = '22023';
      end if;
    end if;
    v_subtotal := v_subtotal + (v_item->>'unit_price')::integer * (v_item->>'quantity')::integer;
  end loop;

  if p_discount is null or p_discount < 0 or p_discount > v_subtotal then
    raise exception 'Remise invalide' using errcode = '22023';
  end if;
  v_total := v_subtotal - p_discount;
  if p_advance is null or p_advance < 0 or p_advance > v_total then
    raise exception 'Avance invalide' using errcode = '22023';
  end if;

  insert into public.invoice_counters (structure_id, year, last_number)
  values (v_structure, v_year, 1)
  on conflict (structure_id, year)
  do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into v_number;

  insert into public.invoices (structure_id, year, number, patient_name, subtotal, discount, total, advance, created_by)
  values (v_structure, v_year, v_number, btrim(p_patient_name), v_subtotal, p_discount, v_total, p_advance, auth.uid())
  returning * into v_invoice;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.invoice_items (invoice_id, care_name, quantity, unit_price, line_total)
    values (v_invoice.id, v_item->>'care_name', (v_item->>'quantity')::integer,
            (v_item->>'unit_price')::integer, (v_item->>'unit_price')::integer * (v_item->>'quantity')::integer);
  end loop;

  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'invoice_create', v_invoice.id);

  return v_invoice;
end $$;

create function public.cancel_invoice(p_invoice_id uuid, p_reason text)
returns public.invoices
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_invoice public.invoices;
begin
  if v_role is null or v_role not in ('structure_admin', 'cashier') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'Motif requis' using errcode = '22023';
  end if;
  select * into v_invoice from public.invoices
   where id = p_invoice_id and structure_id = v_structure for update;
  if not found then
    raise exception 'Facture introuvable' using errcode = '22023';
  end if;
  if v_invoice.status = 'annule' then
    raise exception 'Facture déjà annulée' using errcode = '22023';
  end if;
  update public.invoices set status = 'annule', cancel_reason = btrim(p_reason)
   where id = p_invoice_id returning * into v_invoice;
  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'invoice_cancel', p_invoice_id);
  return v_invoice;
end $$;

create function public.register_invoice_print(p_invoice_id uuid)
returns public.invoices
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_invoice public.invoices;
begin
  if v_role is null or v_role not in ('structure_admin', 'cashier') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select * into v_invoice from public.invoices
   where id = p_invoice_id and structure_id = v_structure for update;
  if not found then
    raise exception 'Facture introuvable' using errcode = '22023';
  end if;
  update public.invoices set print_count = print_count + 1
   where id = p_invoice_id returning * into v_invoice;
  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'invoice_print', p_invoice_id);
  return v_invoice;
end $$;

-- privileges
grant execute on function
  public.create_invoice(text, jsonb, integer, integer),
  public.cancel_invoice(uuid, text),
  public.register_invoice_print(uuid)
  to authenticated;
grant select on public.invoices, public.invoice_items to authenticated;