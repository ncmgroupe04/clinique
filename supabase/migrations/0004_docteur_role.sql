-- 0004 : ajout du rôle docteur (lecture seule sur les tickets en V1)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('platform_admin', 'structure_admin', 'cashier', 'docteur'));