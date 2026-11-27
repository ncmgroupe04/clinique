-- 0047 : durcissement des ordonnances.
--  - contrôle d'abonnement actif dans la fonction ;
--  - déplacement de la logique dans le schéma app (non exposé) avec wrapper
--    SECURITY INVOKER dans public, comme le reste des RPC (0020) ;
--  - suppression des écritures directes sur prescriptions/prescription_items
--    pour forcer le passage par la fonction (audit + validation).
create or replace function app.create_prescription(
  p_patient_name text,
  p_patient_age text,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_active boolean;
  v_suspended boolean;
  v_ends timestamptz;
  v_doctor_id uuid := auth.uid();
  v_prescription_id uuid;
  v_item jsonb;
begin
  if v_role is null or v_role not in ('structure_admin', 'docteur') or v_structure is null then
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
    raise exception 'Au moins un médicament requis' using errcode = '22023';
  end if;

  insert into public.prescriptions (structure_id, patient_name, patient_age, doctor_id)
  values (v_structure, btrim(p_patient_name), nullif(btrim(coalesce(p_patient_age, '')), ''), v_doctor_id)
  returning id into v_prescription_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.prescription_items (prescription_id, label, posology, duration_days, quantity)
    values (
      v_prescription_id,
      coalesce(v_item->>'label', ''),
      coalesce(v_item->>'posology', ''),
      nullif(v_item->>'duration_days', '')::integer,
      coalesce((v_item->>'quantity')::integer, 1)
    );
  end loop;

  insert into public.audit_log (structure_id, user_id, action, prescription_id)
  values (v_structure, auth.uid(), 'prescription_create', v_prescription_id);

  return v_prescription_id;
end;
$$;

-- Wrapper public SECURITY INVOKER (exposé à PostgREST)
create or replace function public.create_prescription(
  p_patient_name text,
  p_patient_age text,
  p_items jsonb
) returns uuid
language sql
security invoker
set search_path = ''
as $$
  select app.create_prescription(p_patient_name, p_patient_age, p_items);
$$;

revoke all on function public.create_prescription(text, text, jsonb) from public, anon;
grant execute on function public.create_prescription(text, text, jsonb) to authenticated;

-- Retrait des écritures directes pour forcer le passage par la fonction.
revoke insert, update, delete on public.prescriptions from authenticated;
revoke insert, update, delete on public.prescription_items from authenticated;
