-- 0011 : unité de comptage des soins (ex. "Nuit" compté par nombre de nuits)
alter table public.cares
  add column if not exists unit text not null default 'unité';