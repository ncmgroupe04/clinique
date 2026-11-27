-- 0042 : autoriser l'admin de la structure à supprimer un service inutilisé.
-- Sans cela, la suppression ne fonctionnait que via la clé service-role.
drop policy if exists services_delete on public.services;

create policy services_delete on public.services for delete to authenticated
  using (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id());

grant delete on public.services to authenticated;
