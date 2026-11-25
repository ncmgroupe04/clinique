-- 0022 : module Dépenses (caisse)
-- Chaque structure gère ses dépenses : lecture/écriture par l'admin de structure
-- et le caissier, isolation stricte par structure_id, annulation avec motif.

create table public.depenses (
  id            uuid primary key default gen_random_uuid(),
  structure_id  uuid not null references public.structures (id),
  date          date not null default (now() at time zone 'UTC')::date,
  libelle       text not null check (char_length(btrim(libelle)) between 1 and 200),
  categorie     text not null check (categorie in ('Fournitures', 'Loyer', 'Salaires', 'Entretien', 'Transport', 'Autre')),
  montant       integer not null check (montant >= 0),
  note          text check (char_length(note) <= 500),
  status        text not null default 'actif' check (status in ('actif', 'annule')),
  cancel_reason text,
  created_by    uuid not null default auth.uid() references public.profiles (id),
  created_at    timestamptz not null default now(),
  constraint depenses_cancel_chk check (
    (status = 'annule' and cancel_reason is not null and char_length(btrim(cancel_reason)) >= 3)
    or (status = 'actif')
  )
);
create index depenses_structure_date_idx on public.depenses (structure_id, date desc, created_at desc);

-- Pas de suppression physique : on annule (comme les tickets).
create trigger depenses_no_delete before delete on public.depenses
  for each row execute function app.block_delete();

-- Champs métier figés après création ; seule l'annulation est permise.
create function app.depenses_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.structure_id is distinct from old.structure_id
     or new.date is distinct from old.date
     or new.libelle is distinct from old.libelle
     or new.categorie is distinct from old.categorie
     or new.montant is distinct from old.montant
     or new.note is distinct from old.note
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Champ de dépense non modifiable' using errcode = '42501';
  end if;
  if old.status = 'annule' and new.status <> 'annule' then
    raise exception 'Une dépense annulée ne peut pas être réactivée' using errcode = '42501';
  end if;
  if old.status = 'annule' and new.cancel_reason is distinct from old.cancel_reason then
    raise exception 'Motif d''annulation non modifiable' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger depenses_guard before update on public.depenses
  for each row execute function app.depenses_guard();

alter table public.depenses enable row level security;
alter table public.depenses force row level security;

create policy depenses_select on public.depenses for select to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier')
  );
create policy depenses_insert on public.depenses for insert to authenticated
  with check (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier')
    and created_by = (select auth.uid())
  );
create policy depenses_update on public.depenses for update to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier')
  )
  with check (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier')
  );

grant select on public.depenses to authenticated;
grant insert (structure_id, date, libelle, categorie, montant, note) on public.depenses to authenticated;
grant update (status, cancel_reason) on public.depenses to authenticated;
