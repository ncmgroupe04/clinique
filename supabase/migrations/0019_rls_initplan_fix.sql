-- 0019 : derniers durcissements
-- 1. Le schéma des fonctions internes reste inaccessible à anon.
revoke all on schema app from anon;

-- 2. Éviter la réévaluation de auth.uid() par ligne dans la policy profiles.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (
  app.user_role() is not null
  and (
    id = (select auth.uid())
    or (app.user_role() = 'structure_admin' and structure_id = app.user_structure_id())
  )
);
