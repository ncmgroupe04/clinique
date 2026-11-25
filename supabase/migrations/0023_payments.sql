-- 0023 : encaissements successifs (recouvrement du reste à payer)
-- Chaque paiement est tracé ; l'avance du ticket/facture devient le total encaissé
-- et le "reste" (colonne générée) se met à jour automatiquement.

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures (id),
  ticket_id    uuid references public.tickets (id),
  invoice_id   uuid references public.invoices (id),
  amount       integer not null check (amount > 0),
  method       text not null check (method in ('especes', 'wave', 'orange_money', 'banque', 'autre')),
  paid_at      timestamptz not null default now(),
  note         text check (char_length(note) <= 500),
  created_by   uuid not null default auth.uid() references public.profiles (id),
  created_at   timestamptz not null default now(),
  constraint payments_one_document_chk check (
    ((ticket_id is not null)::int + (invoice_id is not null)::int) = 1
  )
);
create index payments_structure_paid_idx on public.payments (structure_id, paid_at desc);
create index payments_ticket_idx on public.payments (ticket_id);
create index payments_invoice_idx on public.payments (invoice_id);

-- Un paiement est une pièce financière : ni suppression ni modification.
create trigger payments_no_delete before delete on public.payments
  for each row execute function app.block_delete();
create trigger payments_no_update before update on public.payments
  for each row execute function app.block_update();

alter table public.payments enable row level security;
alter table public.payments force row level security;

create policy payments_select on public.payments for select to authenticated
  using (
    structure_id = app.user_structure_id()
    and app.user_role() in ('structure_admin', 'cashier')
  );

-- Encaisser un paiement : met à jour l'avance (donc le reste) du document.
create function public.add_payment(
  p_ticket_id uuid,
  p_invoice_id uuid,
  p_amount integer,
  p_method text,
  p_note text default null
) returns public.payments
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_ticket public.tickets;
  v_invoice public.invoices;
  v_payment public.payments;
  v_remaining integer;
begin
  if v_role is null or v_role not in ('structure_admin', 'cashier') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_method is null or p_method not in ('especes', 'wave', 'orange_money', 'banque', 'autre') then
    raise exception 'Moyen de paiement invalide' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = '22023';
  end if;

  if p_ticket_id is not null and p_invoice_id is null then
    select * into v_ticket from public.tickets
     where id = p_ticket_id and structure_id = v_structure for update;
    if not found then
      raise exception 'Ticket introuvable' using errcode = '22023';
    end if;
    if v_ticket.status <> 'actif' then
      raise exception 'Ticket annulé' using errcode = '22023';
    end if;
    v_remaining := v_ticket.total - v_ticket.advance;
    if p_amount > v_remaining then
      raise exception 'Montant supérieur au reste à payer' using errcode = '22023';
    end if;
    update public.tickets set advance = advance + p_amount where id = p_ticket_id;
  elsif p_invoice_id is not null and p_ticket_id is null then
    select * into v_invoice from public.invoices
     where id = p_invoice_id and structure_id = v_structure for update;
    if not found then
      raise exception 'Facture introuvable' using errcode = '22023';
    end if;
    if v_invoice.status <> 'actif' then
      raise exception 'Facture annulée' using errcode = '22023';
    end if;
    v_remaining := v_invoice.total - v_invoice.advance;
    if p_amount > v_remaining then
      raise exception 'Montant supérieur au reste à payer' using errcode = '22023';
    end if;
    update public.invoices set advance = advance + p_amount where id = p_invoice_id;
  else
    raise exception 'Document invalide' using errcode = '22023';
  end if;

  insert into public.payments (structure_id, ticket_id, invoice_id, amount, method, note, created_by)
  values (v_structure, p_ticket_id, p_invoice_id, p_amount, p_method,
          nullif(btrim(p_note), ''), auth.uid())
  returning * into v_payment;

  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'payment_create', coalesce(p_ticket_id, p_invoice_id));

  return v_payment;
end $$;

revoke all on public.payments from public, anon;
grant select on public.payments to authenticated;

revoke all on function public.add_payment(uuid, uuid, integer, text, text) from public, anon;
grant execute on function public.add_payment(uuid, uuid, integer, text, text) to authenticated;
