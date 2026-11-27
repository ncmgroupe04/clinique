-- 0046 : quota mensuel de documents vérifié DANS la base (anti-contournement RPC).
create table if not exists public.document_quota_counters (
  structure_id uuid not null references public.structures (id) on delete cascade,
  month        date not null,
  used         integer not null default 0 check (used >= 0),
  primary key (structure_id, month)
);

alter table public.document_quota_counters enable row level security;
alter table public.document_quota_counters force row level security;
revoke all on public.document_quota_counters from anon, authenticated;

create or replace function app.assert_document_quota(p_structure_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_max integer;
  v_month date := date_trunc('month', now())::date;
  v_used integer;
begin
  select plan_id into v_plan_id from public.structures where id = p_structure_id;
  if v_plan_id is null then
    -- Aucun plan : on laisse passer (période d'essai / formule ami).
    return;
  end if;
  select max_documents_per_month into v_max
    from public.subscription_plans where id = v_plan_id;
  if v_max is null then
    return; -- illimité
  end if;

  -- Verrou de ligne sur le compteur mensuel.
  insert into public.document_quota_counters (structure_id, month, used)
  values (p_structure_id, v_month, 0)
  on conflict (structure_id, month) do nothing;

  select used into v_used
    from public.document_quota_counters
   where structure_id = p_structure_id and month = v_month
   for update;

  if v_used >= v_max then
    raise exception 'Quota mensuel atteint (% documents).', v_max using errcode = 'P0001';
  end if;

  update public.document_quota_counters
     set used = used + 1
   where structure_id = p_structure_id and month = v_month;
end;
$$;

revoke all on function app.assert_document_quota(uuid) from public, anon;
grant execute on function app.assert_document_quota(uuid) to authenticated;
