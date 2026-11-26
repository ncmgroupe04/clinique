-- 0030 : module Agenda / Rendez-vous
-- Rendez-vous scopés par structure, sans suppression physique (on change le statut).

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  structure_id     uuid not null references public.structures(id),
  patient_name     text not null check (char_length(btrim(patient_name)) between 1 and 200),
  patient_age      text check (char_length(patient_age) <= 40),
  appointment_date date not null,
  appointment_time time not null,
  doctor_id        uuid references public.profiles(id),
  motif            text check (char_length(motif) <= 500),
  status           text not null default 'planifie' check (status in ('planifie','termine','annule')),
  cancel_reason    text,
  notes            text check (char_length(notes) <= 1000),
  created_by       uuid not null default auth.uid() references public.profiles(id),
  created_at       timestamptz not null default now()
);

create index if not exists appointments_structure_date_time_idx
  on public.appointments (structure_id, appointment_date, appointment_time);

-- Pas de suppression physique : on annule (comme les tickets et les dépenses).
drop trigger if exists appointments_no_delete on public.appointments;
create trigger appointments_no_delete before delete on public.appointments
  for each row execute function app.block_delete();

-- RLS : lecture et écriture réservées aux membres de la structure.
alter table public.appointments enable row level security;
alter table public.appointments force row level security;

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier', 'docteur')
  );

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments for insert to authenticated
  with check (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier', 'docteur')
  );

drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier', 'docteur')
  )
  with check (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier', 'docteur')
  );

-- Privilèges minimaux : ni suppression, ni modification de structure_id / created_by.
grant select on public.appointments to authenticated;
grant insert (structure_id, patient_name, patient_age, appointment_date, appointment_time, doctor_id, motif, notes) on public.appointments to authenticated;
grant update (status, cancel_reason, notes) on public.appointments to authenticated;
