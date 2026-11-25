-- 0024_ordonnances.sql : module Ordonnancier (catalogue médicaments + ordonnances)
-- Catalogue global (référentiel national) + ordonnances scopées par structure.

create table if not exists public.medications (
  id           uuid primary key default gen_random_uuid(),
  dci          text not null,                 -- dénomination commune internationale
  brand        text,                          -- nom commercial (optionnel)
  class        text not null,                 -- classe thérapeutique
  form         text not null,                 -- comprimé, sirop, injectable...
  dosage       text,                          -- ex. 500 mg
  unit         text,                          -- mg, ml, gouttes...
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index medications_dci_idx on public.medications (lower(dci));
create index medications_class_idx on public.medications (class);

-- Alternatives thérapeutiques (relation symétrique stockée une fois, a<b)
create table if not exists public.medication_alternatives (
  medication_id  uuid not null references public.medications(id) on delete cascade,
  alternative_id uuid not null references public.medications(id) on delete cascade,
  relation       text not null default 'same_class' check (relation in ('same_class','allergy','rupture','other')),
  note           text check (char_length(note) <= 300),
  primary key (medication_id, alternative_id),
  constraint medication_alternatives_no_self check (medication_id <> alternative_id)
);

create table if not exists public.prescriptions (
  id            uuid primary key default gen_random_uuid(),
  structure_id  uuid not null references public.structures(id),
  patient_name  text not null check (char_length(patient_name) between 1 and 200),
  patient_age   text check (char_length(patient_age) <= 40),
  doctor_id     uuid not null references public.profiles(id),
  status        text not null default 'actif' check (status in ('actif','annule')),
  cancel_reason text,
  print_count   integer not null default 0 check (print_count >= 0),
  created_at    timestamptz not null default now()
);
create index prescriptions_structure_created_idx on public.prescriptions (structure_id, created_at desc);

create table if not exists public.prescription_items (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medication_id   uuid references public.medications(id),
  label           text not null check (char_length(label) between 1 and 200),  -- copie au moment de la création
  posology        text not null check (char_length(posology) between 1 and 200),
  duration_days   integer check (duration_days is null or duration_days between 1 and 365),
  quantity        integer check (quantity is null or quantity between 1 and 10000),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index prescription_items_prescription_idx on public.prescription_items (prescription_id, sort_order);

-- Protection anti-suppression
create trigger prescriptions_no_delete before delete on public.prescriptions
  for each row execute function app.block_delete();
create trigger prescription_items_no_delete before delete on public.prescription_items
  for each row execute function app.block_delete();

-- RLS
alter table public.medications             enable row level security;
alter table public.medication_alternatives enable row level security;
alter table public.prescriptions           enable row level security;
alter table public.prescription_items      enable row level security;
alter table public.medications             force row level security;
alter table public.medication_alternatives force row level security;
alter table public.prescriptions           force row level security;
alter table public.prescription_items      force row level security;

-- Catalogue global : lecture pour tout authentifié
create policy medications_select on public.medications for select to authenticated
  using (true);
create policy medication_alternatives_select on public.medication_alternatives for select to authenticated
  using (true);

-- Ordonnances scopées par structure
create policy prescriptions_select on public.prescriptions for select to authenticated
  using (structure_id = app.user_structure_id());
create policy prescriptions_insert on public.prescriptions for insert to authenticated
  with check (app.user_role() in ('structure_admin','docteur') and structure_id = app.user_structure_id());
create policy prescriptions_update on public.prescriptions for update to authenticated
  using (app.user_role() in ('structure_admin','docteur') and structure_id = app.user_structure_id())
  with check (app.user_role() in ('structure_admin','docteur') and structure_id = app.user_structure_id());

create policy prescription_items_select on public.prescription_items for select to authenticated
  using (exists (select 1 from public.prescriptions p where p.id = prescription_id and p.structure_id = app.user_structure_id()));
create policy prescription_items_insert on public.prescription_items for insert to authenticated
  with check (exists (select 1 from public.prescriptions p where p.id = prescription_id and p.structure_id = app.user_structure_id() and app.user_role() in ('structure_admin','docteur')));
create policy prescription_items_update on public.prescription_items for update to authenticated
  using (exists (select 1 from public.prescriptions p where p.id = prescription_id and p.structure_id = app.user_structure_id() and app.user_role() in ('structure_admin','docteur')))
  with check (exists (select 1 from public.prescriptions p where p.id = prescription_id and p.structure_id = app.user_structure_id() and app.user_role() in ('structure_admin','docteur')));
create policy prescription_items_delete on public.prescription_items for delete to authenticated
  using (exists (select 1 from public.prescriptions p where p.id = prescription_id and p.structure_id = app.user_structure_id() and app.user_role() in ('structure_admin','docteur')));

-- Privilèges
grant select on public.medications, public.medication_alternatives, public.prescriptions, public.prescription_items to authenticated;
grant insert (structure_id, patient_name, patient_age, doctor_id) on public.prescriptions to authenticated;
grant update (status, cancel_reason, print_count) on public.prescriptions to authenticated;
grant insert (prescription_id, medication_id, label, posology, duration_days, quantity, sort_order) on public.prescription_items to authenticated;
grant update (posology, duration_days, quantity, sort_order) on public.prescription_items to authenticated;
grant delete on public.prescription_items to authenticated;