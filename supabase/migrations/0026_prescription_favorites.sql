-- 0026 : protocoles / favoris d'ordonnance par médecin

create table if not exists public.prescription_favorites (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures(id),
  doctor_id    uuid not null references public.profiles(id),
  name         text not null check (char_length(name) between 1 and 120),
  items        jsonb not null,
  created_at   timestamptz not null default now()
);
create index prescription_favorites_doctor_idx on public.prescription_favorites (structure_id, doctor_id);

alter table public.prescription_favorites enable row level security;
alter table public.prescription_favorites force row level security;

create policy prescription_favorites_select on public.prescription_favorites for select to authenticated
  using (structure_id = app.user_structure_id() and (doctor_id = auth.uid() or app.user_role() = 'structure_admin'));
create policy prescription_favorites_insert on public.prescription_favorites for insert to authenticated
  with check (app.user_role() in ('structure_admin','docteur') and structure_id = app.user_structure_id() and doctor_id = auth.uid());
create policy prescription_favorites_delete on public.prescription_favorites for delete to authenticated
  using (structure_id = app.user_structure_id() and (doctor_id = auth.uid() or app.user_role() = 'structure_admin'));

create trigger prescription_favorites_no_delete before delete on public.prescription_favorites
  for each row execute function app.block_delete();

grant select, insert on public.prescription_favorites to authenticated;