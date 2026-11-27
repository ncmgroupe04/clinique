-- 0045 : durcissement des créations de tickets et de factures.
--  - contrôle d'abonnement actif (pas seulement dans l'interface) ;
--  - quota mensuel vérifié DANS la base ;
--  - prix unitaire des factures résolu depuis public.cares (le client ne choisit plus le prix).
create or replace function public.create_ticket(
  p_service_id uuid,
  p_patient_name text,
  p_quantity integer default 1,
  p_advance integer default 0
) returns public.tickets
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_service public.services;
  v_active boolean;
  v_suspended boolean;
  v_ends timestamptz;
  v_year integer := extract(year from now())::integer;
  v_number integer;
  v_total integer;
  v_ticket public.tickets;
begin
  if v_role is null or v_role not in ('structure_admin', 'cashier') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select active, suspended, subscription_ends_at into v_active, v_suspended, v_ends
    from public.structures where id = v_structure;
  if not coalesce(v_active, false) or coalesce(v_suspended, false)
     or (v_ends is not null and v_ends < now()) then
    raise exception 'Abonnement inactif' using errcode = '42501';
  end if;
  if p_patient_name is null or char_length(btrim(p_patient_name)) = 0 then
    raise exception 'Nom du patient requis' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'Quantité invalide' using errcode = '22023';
  end if;

  select * into v_service from public.services
   where id = p_service_id and structure_id = v_structure and active;
  if not found then
    raise exception 'Service introuvable' using errcode = '22023';
  end if;

  v_total := v_service.price * p_quantity;
  if p_advance is null or p_advance < 0 or p_advance > v_total then
    raise exception 'Avance invalide' using errcode = '22023';
  end if;

  perform app.assert_document_quota(v_structure);

  insert into public.ticket_counters (structure_id, year, last_number)
  values (v_structure, v_year, 1)
  on conflict (structure_id, year)
  do update set last_number = public.ticket_counters.last_number + 1
  returning last_number into v_number;

  insert into public.tickets (structure_id, year, number, patient_name, service_id, service_name,
                              unit_price, quantity, total, advance, created_by)
  values (v_structure, v_year, v_number, btrim(p_patient_name), v_service.id, v_service.name,
          v_service.price, p_quantity, v_total, p_advance, auth.uid())
  returning * into v_ticket;

  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'ticket_create', v_ticket.id);

  return v_ticket;
end $$;

-- create_invoice (version sécurisée)
create or replace function public.create_invoice(
  p_patient_name text,
  p_items jsonb,
  p_discount integer default 0,
  p_advance integer default 0,
  p_template_id uuid default null
) returns public.invoices
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_active boolean;
  v_suspended boolean;
  v_ends timestamptz;
  v_year integer := extract(year from now())::integer;
  v_number integer;
  v_subtotal integer := 0;
  v_total integer;
  v_invoice public.invoices;
  v_item jsonb;
  v_care public.cares;
  v_cotation text;
  v_dents text;
  v_qty integer;
  v_unit integer;
  v_template uuid;
begin
  if v_role is null or v_role not in ('structure_admin', 'cashier', 'platform_admin') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select active, suspended, subscription_ends_at into v_active, v_suspended, v_ends
    from public.structures where id = v_structure;
  if not coalesce(v_active, false) or coalesce(v_suspended, false)
     or (v_ends is not null and v_ends < now()) then
    raise exception 'Abonnement inactif' using errcode = '42501';
  end if;
  if p_patient_name is null or char_length(btrim(p_patient_name)) = 0 then
    raise exception 'Nom du patient requis' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Au moins un soin requis' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 200 then
    raise exception 'Trop de lignes' using errcode = '22023';
  end if;

  -- Validation + sous-total calculé depuis la base.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty < 1 or v_qty > 1000 then
      raise exception 'Quantité invalide' using errcode = '22023';
    end if;
    if v_item->>'care_id' is not null and v_item->>'care_id' <> '' then
      select * into v_care from public.cares
       where id = (v_item->>'care_id')::uuid and structure_id = v_structure and active;
      if not found then
        raise exception 'Soin introuvable' using errcode = '22023';
      end if;
      v_unit := v_care.price;  -- prix IMPOSÉ par la base
    else
      -- Ligne libre : réservée à l'admin, plafonnée.
      if v_role <> 'structure_admin' and v_role <> 'platform_admin' then
        raise exception 'Soin inconnu' using errcode = '42501';
      end if;
      v_unit := coalesce((v_item->>'unit_price')::integer, 0);
      if v_unit < 0 or v_unit > 100000000 then
        raise exception 'Prix invalide' using errcode = '22023';
      end if;
    end if;
    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  if p_discount is null or p_discount < 0 or p_discount > v_subtotal then
    raise exception 'Remise invalide' using errcode = '22023';
  end if;
  v_total := v_subtotal - p_discount;
  if p_advance is null or p_advance < 0 or p_advance > v_total then
    raise exception 'Avance invalide' using errcode = '22023';
  end if;

  perform app.assert_document_quota(v_structure);

  -- template
  if p_template_id is not null then
    select id into v_template from public.invoice_templates
     where id = p_template_id and structure_id = v_structure;
  end if;
  if v_template is null then
    select id into v_template from public.invoice_templates
     where structure_id = v_structure and is_default
     limit 1;
  end if;

  insert into public.invoice_counters (structure_id, year, last_number)
  values (v_structure, v_year, 1)
  on conflict (structure_id, year)
  do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into v_number;

  insert into public.invoices (structure_id, year, number, patient_name, subtotal, discount, total, advance, created_by, template_id)
  values (v_structure, v_year, v_number, btrim(p_patient_name), v_subtotal, p_discount, v_total, p_advance, auth.uid(), v_template)
  returning * into v_invoice;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cotation := nullif(btrim(coalesce(v_item->>'cotation','')), '');
    v_dents := nullif(btrim(coalesce(v_item->>'dents','')), '');
    if v_cotation is not null and v_cotation !~ '^[A-Za-z0-9][A-Za-z0-9 -]*$' then
      raise exception 'Cotation invalide' using errcode = '22023';
    end if;
    if v_item->>'care_id' is not null and v_item->>'care_id' <> '' then
      select * into v_care from public.cares
       where id = (v_item->>'care_id')::uuid and structure_id = v_structure;
      if v_cotation is null then
        v_cotation := v_care.cotation;
      end if;
      v_unit := v_care.price;
    else
      v_unit := coalesce((v_item->>'unit_price')::integer, 0);
    end if;
    insert into public.invoice_items (invoice_id, care_name, quantity, unit_price, line_total, cotation, dents)
    values (v_invoice.id, coalesce(v_item->>'care_name', v_care.name), (v_item->>'quantity')::integer,
            v_unit, v_unit * (v_item->>'quantity')::integer, v_cotation, v_dents);
  end loop;

  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'invoice_create', v_invoice.id);

  return v_invoice;
end $$;

grant execute on function public.create_invoice(text, jsonb, integer, integer, uuid) to authenticated;
revoke execute on function public.create_invoice(text, jsonb, integer, integer, uuid) from anon;
