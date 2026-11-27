-- 0048 : ajout d'une dimension IP à l'anti-force-brute (en complément de l'e-mail).
alter table public.login_attempts add column if not exists ip text;
create index if not exists login_attempts_ip_created_idx on public.login_attempts (ip, created_at desc);
