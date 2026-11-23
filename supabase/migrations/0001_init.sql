-- 0001_init.sql : module Ticket multi-structures (isolation par structure_id + RLS)
-- Prérequis fournis par Supabase : schéma auth (auth.users, auth.uid()), rôles anon / authenticated.

create schema if not exists app;

-- ---------------------------------------------------------------- tables

create table public.structures (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 200),
  address     text check (char_length(address) <= 300),
  phone       text check (char_length(phone) <= 40),
  header_text text check (char_length(header_text) <= 500),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  structure_id uuid references public.structures (id),
  role         text not null check (role in ('platform_admin', 'structure_admin', 'cashier')),
  full_name    text check (char_length(full_name) <= 200),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint profiles_structure_chk check (
    (role = 'platform_admin' and structure_id is null)
    or (role <> 'platform_admin' and structure_id is not null)
  )
);
create index profiles_structure_idx on public.profiles (structure_id);

create table public.services (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures (id),
  name         text not null check (char_length(name) between 1 and 200),
  price        integer not null check (price >= 0),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index services_structure_idx on public.services (structure_id);

-- Compteur de numéros de reçu : par structure ET par année.
create table public.ticket_counters (
  structure_id uuid not null references public.structures (id),
  year         integer not null,
  last_number  integer not null default 0 check (last_number >= 0),
  primary key (structure_id, year)
);

create table public.tickets (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures (id),
  year         integer not null,
  number       integer not null check (number > 0),
  patient_name text not null check (char_length(patient_name) between 1 and 200),
  service_id   uuid not null references public.services (id),
  service_name text not null,            -- copie
  unit_price   integer not null check (unit_price >= 0),  -- copie du prix à la création
  quantity     integer not null check (quantity between 1 and 100),
  total        integer not null check (total >= 0),
  advance      integer not null default 0,
  remaining    integer generated always as (total - advance) stored,
  status       text not null default 'actif' check (status in ('actif', 'annule')),
  cancel_reason text,
  print_count  integer not null default 0 check (print_count >= 0),
  created_by   uuid not null references public.profiles (id),
  created_at   timestamptz not null default now(),
  constraint tickets_advance_chk check (advance >= 0 and advance <= total),
  constraint tickets_cancel_chk check (
    (status = 'annule' and cancel_reason is not null and char_length(btrim(cancel_reason)) >= 3)
    or (status = 'actif')
  ),
  constraint tickets_number_uniq unique (structure_id, year, number)
);
create index tickets_structure_created_idx on public.tickets (structure_id, created_at desc);

create table public.audit_log (
  id           bigint generated always as identity primary key,
  structure_id uuid references public.structures (id),
  user_id      uuid,
  action       text not null,
  ticket_id    uuid,
  created_at   timestamptz not null default now()
);
create index audit_structure_idx on public.audit_log (structure_id, created_at desc);

-- ---------------------------------------------------------------- aides (contexte de l'appelant)
-- Échec fermé : profil ou structure inactifs => NULL => aucune policy ne passe.

create function app.user_role() returns text
language sql stable security definer set search_path = ''
as $$
  select p.role
  from public.profiles p
  left join public.structures s on s.id = p.structure_id
  where p.id = auth.uid()
    and p.active
    and (p.role = 'platform_admin' or s.active)
$$;

create function app.user_structure_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.structure_id
  from public.profiles p
  join public.structures s on s.id = p.structure_id
  where p.id = auth.uid() and p.active and s.active
$$;

-- ---------------------------------------------------------------- triggers de protection

create function app.block_delete() returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'Suppression interdite sur %', tg_table_name using errcode = '42501';
end $$;

create trigger tickets_no_delete before delete on public.tickets
  for each row execute function app.block_delete();
create trigger audit_no_delete before delete on public.audit_log
  for each row execute function app.block_delete();

create function app.block_update() returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'Modification interdite sur %', tg_table_name using errcode = '42501';
end $$;

create trigger audit_no_update before update on public.audit_log
  for each row execute function app.block_update();

create function app.tickets_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.structure_id is distinct from old.structure_id
     or new.year is distinct from old.year
     or new.number is distinct from old.number
     or new.service_id is distinct from old.service_id
     or new.service_name is distinct from old.service_name
     or new.unit_price is distinct from old.unit_price
     or new.quantity is distinct from old.quantity
     or new.patient_name is distinct from old.patient_name
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Champ de ticket non modifiable' using errcode = '42501';
  end if;
  if old.status = 'annule' and new.status = 'annule' and new.cancel_reason is distinct from old.cancel_reason then
    raise exception 'Motif d''annulation non modifiable' using errcode = '42501';
  end if;
  if old.status = 'annule' and new.status <> 'annule' then
    raise exception 'Un ticket annulé ne peut pas être réactivé' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger tickets_guard before update on public.tickets
  for each row execute function app.tickets_guard();

-- ---------------------------------------------------------------- fonctions métier

create function public.create_ticket(
  p_service_id uuid,
  p_patient_name text,
  p_quantity integer default 1,
  p_advance integer default 0
) returns public.tickets
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_service public.services;
  v_year integer := extract(year from now())::integer;
  v_number integer;
  v_total integer;
  v_ticket public.tickets;
begin
  if v_role is null or v_role not in ('structure_admin', 'cashier') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_patient_name is null or char_length(btrim(p_patient_name)) = 0 then
    raise exception 'Nom du patient requis' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'Quantité invalide' using errcode = '22023';
  end if;

  select * into v_service from public.services
   where id = p_service_id and structure_id = v_structure and active;
  if not found then
    raise exception 'Service introuvable' using errcode = '22023';
  end if;

  v_total := v_service.price * p_quantity;
  if p_advance is null or p_advance < 0 or p_advance > v_total then
    raise exception 'Avance invalide' using errcode = '22023';
  end if;

  -- Numéro attribué dans la transaction : le verrou de ligne sérialise les créations,
  -- un rollback annule aussi l'incrément (pas de trou).
  insert into public.ticket_counters (structure_id, year, last_number)
  values (v_structure, v_year, 1)
  on conflict (structure_id, year)
  do update set last_number = public.ticket_counters.last_number + 1
  returning last_number into v_number;

  insert into public.tickets (structure_id, year, number, patient_name, service_id, service_name,
                              unit_price, quantity, total, advance, created_by)
  values (v_structure, v_year, v_number, btrim(p_patient_name), v_service.id, v_service.name,
          v_service.price, p_quantity, v_total, p_advance, auth.uid())
  returning * into v_ticket;

  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'ticket_create', v_ticket.id);

  return v_ticket;
end $$;

create function public.set_ticket_total(p_ticket_id uuid, p_total integer)
returns public.tickets
language plpgsql security definer set search_path = ''
as $$
declare
  v_structure uuid := app.user_structure_id();
  v_ticket public.tickets;
begin
  if app.user_role() is distinct from 'structure_admin' or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select * into v_ticket from public.tickets
   where id = p_ticket_id and structure_id = v_structure for update;
  if not found then
    raise exception 'Ticket introuvable' using errcode = '22023';
  end if;
  if v_ticket.status <> 'actif' then
    raise exception 'Ticket annulé' using errcode = '22023';
  end if;
  if p_total is null or p_total < v_ticket.advance then
    raise exception 'Total invalide' using errcode = '22023';
  end if;
  update public.tickets set total = p_total where id = p_ticket_id returning * into v_ticket;
  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'ticket_set_total', p_ticket_id);
  return v_ticket;
end $$;

create function public.cancel_ticket(p_ticket_id uuid, p_reason text)
returns public.tickets
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_ticket public.tickets;
begin
  if v_role is null or v_role not in ('structure_admin', 'cashier') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'Motif requis' using errcode = '22023';
  end if;
  select * into v_ticket from public.tickets
   where id = p_ticket_id and structure_id = v_structure for update;
  if not found then
    raise exception 'Ticket introuvable' using errcode = '22023';
  end if;
  -- Un caissier ne gère que les tickets du jour (mêmes règles que sa visibilité).
  if v_role = 'cashier'
     and (v_ticket.created_at at time zone 'UTC')::date <> (now() at time zone 'UTC')::date then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if v_ticket.status = 'annule' then
    raise exception 'Ticket déjà annulé' using errcode = '22023';
  end if;
  update public.tickets set status = 'annule', cancel_reason = btrim(p_reason)
   where id = p_ticket_id returning * into v_ticket;
  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'ticket_cancel', p_ticket_id);
  return v_ticket;
end $$;

create function public.register_print(p_ticket_id uuid)
returns public.tickets
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_ticket public.tickets;
begin
  if v_role is null or v_role not in ('structure_admin', 'cashier') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select * into v_ticket from public.tickets
   where id = p_ticket_id and structure_id = v_structure for update;
  if not found then
    raise exception 'Ticket introuvable' using errcode = '22023';
  end if;
  if v_role = 'cashier'
     and (v_ticket.created_at at time zone 'UTC')::date <> (now() at time zone 'UTC')::date then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  update public.tickets set print_count = print_count + 1
   where id = p_ticket_id returning * into v_ticket;
  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'ticket_print', p_ticket_id);
  return v_ticket;
end $$;

create function public.set_structure_active(p_structure_id uuid, p_active boolean)
returns public.structures
language plpgsql security definer set search_path = ''
as $$
declare
  v_s public.structures;
begin
  if app.user_role() is distinct from 'platform_admin' then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  update public.structures set active = p_active where id = p_structure_id returning * into v_s;
  if not found then
    raise exception 'Structure introuvable' using errcode = '22023';
  end if;
  insert into public.audit_log (structure_id, user_id, action)
  values (p_structure_id, auth.uid(), case when p_active then 'structure_enable' else 'structure_disable' end);
  return v_s;
end $$;

-- ---------------------------------------------------------------- privilèges (moindre privilège)

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema app from public, anon, authenticated;

grant usage on schema public to authenticated;
grant usage on schema app to authenticated;
grant execute on function app.user_role(), app.user_structure_id() to authenticated;

grant select on public.structures, public.profiles, public.services, public.tickets, public.audit_log
  to authenticated;
grant insert (name, address, phone, header_text) on public.structures to authenticated;
grant update (name, address, phone, header_text) on public.structures to authenticated;
grant insert (structure_id, name, price) on public.services to authenticated;
grant update (name, price, active) on public.services to authenticated;
-- ticket_counters : aucun droit client. tickets / audit_log : écriture via fonctions uniquement.

grant execute on function
  public.create_ticket(uuid, text, integer, integer),
  public.set_ticket_total(uuid, integer),
  public.cancel_ticket(uuid, text),
  public.register_print(uuid),
  public.set_structure_active(uuid, boolean)
  to authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.structures      enable row level security;
alter table public.profiles        enable row level security;
alter table public.services        enable row level security;
alter table public.ticket_counters enable row level security;
alter table public.tickets         enable row level security;
alter table public.audit_log       enable row level security;
alter table public.structures      force row level security;
alter table public.profiles        force row level security;
alter table public.services        force row level security;
alter table public.ticket_counters force row level security;
alter table public.tickets         force row level security;
alter table public.audit_log       force row level security;

-- structures
create policy structures_select on public.structures for select to authenticated
  using (app.user_role() = 'platform_admin' or id = app.user_structure_id());
create policy structures_insert on public.structures for insert to authenticated
  with check (app.user_role() = 'platform_admin');
create policy structures_update on public.structures for update to authenticated
  using (app.user_role() = 'structure_admin' and id = app.user_structure_id())
  with check (app.user_role() = 'structure_admin' and id = app.user_structure_id());

-- profiles : soi-même, ou tous ceux de sa structure pour l'admin de structure
create policy profiles_select on public.profiles for select to authenticated
  using (
    app.user_role() is not null
    and (id = auth.uid()
         or (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id()))
  );

-- services
create policy services_select on public.services for select to authenticated
  using (structure_id = app.user_structure_id());
create policy services_insert on public.services for insert to authenticated
  with check (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id());
create policy services_update on public.services for update to authenticated
  using (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id())
  with check (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id());

-- tickets : lecture seule côté client ; caissier = tickets du jour de sa structure
create policy tickets_select on public.tickets for select to authenticated
  using (
    structure_id = app.user_structure_id()
    and (
      app.user_role() = 'structure_admin'
      or (app.user_role() = 'cashier'
          and (created_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date)
    )
  );

-- audit_log : lecture par l'admin de la structure
create policy audit_select on public.audit_log for select to authenticated
  using (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id());

-- ticket_counters : RLS active, aucune policy => inaccessible au client.
