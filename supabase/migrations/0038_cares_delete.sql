-- 0038 : autoriser la suppression d'un soin par l'admin de la structure.
create policy cares_delete on public.cares for delete to authenticated
  using (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id());

grant delete on public.cares to authenticated;
