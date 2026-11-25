-- 0028 : rétablissement d'une dépense annulée

create or replace function app.depenses_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.structure_id is distinct from old.structure_id
     or new.date is distinct from old.date
     or new.libelle is distinct from old.libelle
     or new.categorie is distinct from old.categorie
     or new.montant is distinct from old.montant
     or new.note is distinct from old.note
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Champ de dépense non modifiable' using errcode = '42501';
  end if;
  if old.status = 'annule' and new.status = 'annule' and new.cancel_reason is distinct from old.cancel_reason then
    raise exception 'Motif d''annulation non modifiable' using errcode = '42501';
  end if;
  if old.status = 'actif' and new.status = 'annule' then
    if new.cancel_reason is null or char_length(btrim(new.cancel_reason)) < 3 then
      raise exception 'Motif d''annulation requis' using errcode = '22023';
    end if;
  end if;
  -- Réactivation : le motif doit être effacé.
  if old.status = 'annule' and new.status = 'actif' and new.cancel_reason is not null then
    raise exception 'Le motif doit être effacé lors du rétablissement' using errcode = '22023';
  end if;
  return new;
end $$;