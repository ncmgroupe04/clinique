-- 0025 : création d'une ordonnance (transaction, numéro auto non requis ici)

create or replace function public.create_prescription(
  p_patient_name text,
  p_patient_age  text,
  p_items        jsonb
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := app.user_role();
  v_structure uuid := app.user_structure_id();
  v_prescription_id uuid;
  v_item jsonb;
  v_order integer := 0;
begin
  if v_role is null or v_role not in ('structure_admin','docteur') or v_structure is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_patient_name is null or char_length(btrim(p_patient_name)) = 0 then
    raise exception 'Nom du patient requis' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Au moins une ligne requise' using errcode = '22023';
  end if;

  insert into public.prescriptions (structure_id, patient_name, patient_age, doctor_id)
  values (v_structure, btrim(p_patient_name), nullif(btrim(coalesce(p_patient_age,'')),''), auth.uid())
  returning id into v_prescription_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_order := v_order + 1;
    insert into public.prescription_items (prescription_id, medication_id, label, posology, duration_days, quantity, sort_order)
    values (
      v_prescription_id,
      nullif(v_item->>'medication_id','')::uuid,
      btrim(v_item->>'label'),
      btrim(v_item->>'posology'),
      nullif(v_item->>'duration_days','')::integer,
      nullif(v_item->>'quantity','')::integer,
      coalesce((v_item->>'sort_order')::integer, v_order)
    );
  end loop;

  insert into public.audit_log (structure_id, user_id, action, ticket_id)
  values (v_structure, auth.uid(), 'prescription_create', v_prescription_id);

  return v_prescription_id;
end $$;

grant execute on function public.create_prescription(text, text, jsonb) to authenticated;