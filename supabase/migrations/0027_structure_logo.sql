-- 0027 : logo de structure (stockage privé + colonne logo_path)

alter table public.structures add column if not exists logo_path text;

-- Bucket privé : un seul fichier par structure, chemin = <structure_id>/logo.<ext>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('structure-logos', 'structure-logos', false, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "structure_logos_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'structure-logos'
    and (storage.foldername(name))[1] = app.user_structure_id()::text
  );

create policy "structure_logos_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'structure-logos'
    and (storage.foldername(name))[1] = app.user_structure_id()::text
    and app.user_role() = 'structure_admin'
  );

create policy "structure_logos_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'structure-logos'
    and (storage.foldername(name))[1] = app.user_structure_id()::text
    and app.user_role() = 'structure_admin'
  )
  with check (
    bucket_id = 'structure-logos'
    and (storage.foldername(name))[1] = app.user_structure_id()::text
    and app.user_role() = 'structure_admin'
  );

create policy "structure_logos_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'structure-logos'
    and (storage.foldername(name))[1] = app.user_structure_id()::text
    and app.user_role() = 'structure_admin'
  );

grant select (logo_path) on public.structures to authenticated;
grant update (logo_path) on public.structures to authenticated;