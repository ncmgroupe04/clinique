-- 0033 : modules Super Admin
-- Abonnements, facturation plateforme, support, notifications, rapports,
-- paramètres globaux et audit avancé.

-- Factures de la plateforme (une par structure et par mois)
create table public.platform_invoices (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures (id),
  period       text not null check (period ~ '^\d{4}-\d{2}$'),
  amount       integer not null check (amount >= 0),
  status       text not null default 'en_attente' check (status in ('en_attente', 'payee')),
  issued_at    timestamptz not null default now(),
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint platform_invoices_unique unique (structure_id, period)
);
create index platform_invoices_structure_idx on public.platform_invoices (structure_id, issued_at desc);

-- Tickets de support
create table public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures (id),
  subject      text not null check (char_length(btrim(subject)) between 1 and 200),
  message      text not null check (char_length(btrim(message)) between 1 and 5000),
  status       text not null default 'ouvert' check (status in ('ouvert', 'en_cours', 'resolu', 'ferme')),
  priority     text not null default 'normal' check (priority in ('faible', 'normal', 'urgent')),
  created_by   uuid not null default auth.uid() references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index support_tickets_structure_idx on public.support_tickets (structure_id, created_at desc);

create table public.support_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.support_tickets (id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles (id),
  body       text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- Notifications (destinataire = utilisateur)
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  body       text,
  type       text not null default 'info' check (type in ('info', 'warning', 'success')),
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- Paramètres globaux de la plateforme (clé/valeur)
create table public.platform_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
alter table public.platform_invoices enable row level security;
alter table public.platform_invoices force row level security;
alter table public.support_tickets enable row level security;
alter table public.support_tickets force row level security;
alter table public.support_messages enable row level security;
alter table public.support_messages force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.platform_settings enable row level security;
alter table public.platform_settings force row level security;

create policy platform_invoices_select on public.platform_invoices for select to authenticated
  using (app.user_role() = 'platform_admin');

create policy support_tickets_select on public.support_tickets for select to authenticated
  using (
    app.user_role() = 'platform_admin'
    or (structure_id = app.user_structure_id() and app.user_role() in ('structure_admin', 'cashier'))
  );
create policy support_tickets_insert on public.support_tickets for insert to authenticated
  with check (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier')
    and created_by = (select auth.uid())
  );
create policy support_tickets_update on public.support_tickets for update to authenticated
  using (
    app.user_role() = 'platform_admin'
    or (structure_id = app.user_structure_id() and app.user_role() = 'structure_admin')
  )
  with check (
    app.user_role() = 'platform_admin'
    or (structure_id = app.user_structure_id() and app.user_role() = 'structure_admin')
  );

create policy support_messages_select on public.support_messages for select to authenticated
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and (
          app.user_role() = 'platform_admin'
          or (t.structure_id = app.user_structure_id() and app.user_role() in ('structure_admin', 'cashier'))
        )
    )
  );
create policy support_messages_insert on public.support_messages for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and (
          app.user_role() = 'platform_admin'
          or (t.structure_id = app.user_structure_id() and app.user_role() in ('structure_admin', 'cashier'))
        )
    )
  );

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- privilèges
revoke all on public.platform_invoices from public, anon;
revoke all on public.support_tickets from public, anon;
revoke all on public.support_messages from public, anon;
revoke all on public.notifications from public, anon;
revoke all on public.platform_settings from public, anon;

grant select on public.platform_invoices to authenticated;
grant select, insert (structure_id, subject, message, priority) on public.support_tickets to authenticated;
grant update (status) on public.support_tickets to authenticated;
grant select, insert (ticket_id, body) on public.support_messages to authenticated;
grant select, update (read) on public.notifications to authenticated;
-- platform_settings : service_role uniquement (via actions serveur)
