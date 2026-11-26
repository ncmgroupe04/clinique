-- 0029 : rend le bucket des logos public pour que getPublicUrl fonctionne
-- (le bucket était créé en privé, ce qui empêchait l'affichage des logos).

update storage.buckets
set public = true
where id = 'structure-logos';