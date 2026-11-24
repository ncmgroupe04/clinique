-- 0012 : autoriser la restauration d'un ticket annulé
create or replace function app.tickets_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.structure_id is distinct from old.structure_id
     or new.year is distinct from old.year
     or new.number is distinct from old.number
     or new.service_id is distinct from old.service_id
     or new.service_name is distinct from old.service_name
     or new.unit_price is distinct from old.unit_price
     or new.quantity is distinct from old.quantity
     or new.patient_name is distinct from old.patient_name
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Champ de ticket non modifiable' using errcode = '42501';
  end if;
  if old.status = 'annule' and new.status = 'annule' and new.cancel_reason is distinct from old.cancel_reason then
    raise exception 'Motif d''annulation non modifiable' using errcode = '42501';
  end if;
  -- La restauration (annulé -> actif) est autorisée ; elle efface le motif.
  if old.status = 'annule' and new.status = 'actif' then
    new.cancel_reason := null;
  end if;
  if old.status = 'actif' and new.status = 'annule' and (new.cancel_reason is null or char_length(btrim(new.cancel_reason)) < 3) then
    raise exception 'Motif requis' using errcode = '22023';
  end if;
  return new;
end $$;