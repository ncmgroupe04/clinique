-- 0036 : paramètres avancés du modèle d'impression des factures.
-- stockés dans print_templates.settings (jsonb) pour chaque structure.

alter table public.print_templates
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Valeurs par défaut pour les factures existantes.
update public.print_templates
set settings = jsonb_build_object(
  'title', 'Facture',
  'number_prefix', '',
  'show_quantity', true,
  'show_unit_price', true,
  'show_discount', true,
  'show_advance', true,
  'show_stamp', true
)
where kind = 'facture' and settings = '{}'::jsonb;
