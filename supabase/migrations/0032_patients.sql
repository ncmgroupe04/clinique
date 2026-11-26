-- 0032 : fiches patients explicites (en plus des dossiers reconstitués)

create table if not exists public.patients (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures(id),
  full_name    text not null check (char_length(btrim(full_name)) between 1 and 200),
  phone        text check (char_length(phone) <= 40),
  patient_age  text check (char_length(patient_age) <= 40),
  notes        text check (char_length(notes) <= 1000),
  created_by   uuid not null default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists patients_structure_created_idx
  on public.patients (structure_id, created_at desc);

alter table public.patients enable row level security;
alter table public.patients force row level security;

drop policy if exists patients_select on public.patients;
create policy patients_select on public.patients for select to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier', 'docteur')
  );

drop policy if exists patients_insert on public.patients;
create policy patients_insert on public.patients for insert to authenticated
  with check (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier', 'docteur')
  );

grant select on public.patients to authenticated;
grant insert (structure_id, full_name, phone, patient_age, notes) on public.patients to authenticated;
