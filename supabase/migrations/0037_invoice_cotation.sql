-- 0037 : cotation (indice) des actes, côté soins et facture — plus ordonnance.
-- La cotation est un code alphanumérique (ex. D5, D80, HBJD001) saisi sur un
-- soin et/ou sur une ligne de facture.

alter table public.cares
  add column if not exists cotation text
  check (cotation is null or char_length(btrim(cotation)) between 1 and 50);

alter table public.invoice_items
  add column if not exists cotation text
  check (cotation is null or char_length(btrim(cotation)) between 1 and 50);

grant select, insert, update on public.cares to authenticated;

create or replace function public.create_invoice(
  p_patient_name text,
  p_items jsonb,
  p_discount integer default 0,
  p_advance integer default 0
) returns public.invoices
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_year integer := extract(year from now())::integer;
  v_number integer;
  v_invoice public.invoices;
  v_item jsonb;
  v_care public.cares;
  v_cotation text;
  v_subtotal integer := 0;
  v_total integer;
begin
  if v_role is null or v_role not in ('structure_admin', 'cashier') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_patient_name is null or char_length(btrim(p_patient_name)) = 0 then
    raise exception 'Nom du patient requis' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Au moins un soin requis' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if (v_item->>'care_id') is not null then
      select * into v_care from public.cares
       where id = (v_item->>'care_id')::uuid and structure_id = v_structure and active;
      if not found then
        raise exception 'Soin introuvable' using errcode = '22023';
      end if;
    end if;
    v_subtotal := v_subtotal + (v_item->>'unit_price')::integer * (v_item->>'quantity')::integer;
  end loop;

  if p_discount is null or p_discount < 0 or p_discount > v_subtotal then
    raise exception 'Remise invalide' using errcode = '22023';
  end if;
  v_total := v_subtotal - p_discount;
  if p_advance is null or p_advance < 0 or p_advance > v_total then
    raise exception 'Avance invalide' using errcode = '22023';
  end if;

  insert into public.invoice_counters (structure_id, year, last_number)
  values (v_structure, v_year, 1)
  on conflict (structure_id, year)
  do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into v_number;

  insert into public.invoices (structure_id, year, number, patient_name, subtotal, discount, total, advance, created_by)
  values (v_structure, v_year, v_number, btrim(p_patient_name), v_subtotal, p_discount, v_total, p_advance, auth.uid())
  returning * into v_invoice;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cotation := nullif(btrim(coalesce(v_item->>'cotation','')), '');
    if v_cotation is null and v_item->>'care_id' is not null then
      select cotation into v_cotation from public.cares
       where id = (v_item->>'care_id')::uuid and structure_id = v_structure;
    end if;
    if v_cotation is not null and v_cotation !~ '^[A-Za-z0-9][A-Za-z0-9 -]*$' then
      raise exception 'Cotation invalide' using errcode = '22023';
    end if;
    insert into public.invoice_items (invoice_id, care_name, quantity, unit_price, line_total, cotation)
    values (v_invoice.id, v_item->>'care_name', (v_item->>'quantity')::integer,
            (v_item->>'unit_price')::integer, (v_item->>'unit_price')::integer * (v_item->>'quantity')::integer,
            v_cotation);
  end loop;

  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'invoice_create', v_invoice.id);

  return v_invoice;
end $$;

grant execute on function public.create_invoice(text, jsonb, integer, integer) to authenticated;

-- Nouvelles colonnes disponibles dans le modèle de facture.
update public.print_templates
set settings = settings || jsonb_build_object('show_date', true, 'show_indice', true)
where kind = 'facture';
