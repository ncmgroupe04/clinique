-- 0013 : protection anti force brute (tentatives de connexion par minute)
create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);
create index login_attempts_email_created_idx on public.login_attempts (email, created_at desc);
alter table public.login_attempts enable row level security;
alter table public.login_attempts force row level security;
-- aucun policy : accessible uniquement côté serveur via service role