-- 0043 : tableau de facture standard pour les NOUVELLES structures uniquement.
-- Les structures déjà présentes ne sont pas modifiées.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'print_templates'
      and column_name = 'settings'
  ) then
    create or replace function app.init_structure_invoice_table() returns trigger
    language plpgsql security definer set search_path = ''
    as $fn$
    declare
      v_settings jsonb := jsonb_build_object(
        'title', 'Facture',
        'number_prefix', '',
        'show_date', true,
        'show_indice', true,
        'show_quantity', true,
        'show_unit_price', true,
        'show_discount', true,
        'show_advance', true,
        'show_stamp', true,
        'show_logo', true,
        'doctor_name', '',
        'practice_line', '',
        'intro_text', '',
        'legal_footer', '',
        'merge_rows', true,
        'columns', jsonb_build_array(
          jsonb_build_object('key', 'quantite', 'label', 'QTE', 'source', 'quantite', 'visible', true, 'span', 1),
          jsonb_build_object('key', 'designations', 'label', 'DESIGNATIONS', 'source', 'texte', 'visible', true, 'span', 1),
          jsonb_build_object('key', 'prix_unitaire', 'label', 'P. UNITAIRE', 'source', 'prix_unitaire', 'visible', true, 'span', 1),
          jsonb_build_object('key', 'total', 'label', 'P. TOTAL', 'source', 'total', 'visible', true, 'span', 1)
        ),
        'extra_rows', jsonb_build_array()
      );
    begin
      insert into public.print_templates (structure_id, kind, header_text, footer_text, settings)
      values (new.id, 'facture', 'Facture', 'Merci de votre confiance', v_settings)
      on conflict (structure_id, kind) do nothing;

      if to_regclass('public.invoice_templates') is not null then
        insert into public.invoice_templates (structure_id, name, settings, is_default)
        select new.id, 'Modèle par défaut', v_settings, true
        where not exists (
          select 1 from public.invoice_templates t where t.structure_id = new.id
        );
      end if;
      return new;
    end;
    $fn$;

    drop trigger if exists init_structure_invoice_table on public.structures;
    create trigger init_structure_invoice_table
      after insert on public.structures
      for each row execute function app.init_structure_invoice_table();
  end if;
end $$;
