-- 0041 : suppression du service parasite créé automatiquement à l'inscription.
-- Les nouvelles inscriptions ne créent plus de services par défaut.
delete from public.services s
where s.name = 'Visite prénatale'
  and s.price = 3000
  and not exists (
    select 1 from public.tickets t where t.service_id = s.id
  );
