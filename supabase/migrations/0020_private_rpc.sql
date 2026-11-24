-- 0020 : sortir la logique privilégiée du schéma exposé à l'API REST.
-- Les fonctions SECURITY DEFINER déménagent dans app (non exposé par PostgREST).
-- Le schéma public ne garde que de fins wrappers SECURITY INVOKER, sans privilège.

alter function public.cancel_invoice(uuid, text)                set schema app;
alter function public.cancel_ticket(uuid, text)                 set schema app;
alter function public.create_invoice(text, jsonb, integer, integer) set schema app;
alter function public.create_ticket(uuid, text, integer, integer)    set schema app;
alter function public.register_invoice_print(uuid)             set schema app;
alter function public.register_print(uuid)                     set schema app;
alter function public.set_structure_active(uuid, boolean)      set schema app;
alter function public.set_ticket_total(uuid, integer)          set schema app;

grant execute on function
  app.cancel_invoice(uuid, text),
  app.cancel_ticket(uuid, text),
  app.create_invoice(text, jsonb, integer, integer),
  app.create_ticket(uuid, text, integer, integer),
  app.register_invoice_print(uuid),
  app.register_print(uuid),
  app.set_structure_active(uuid, boolean),
  app.set_ticket_total(uuid, integer)
to authenticated;

-- Wrappers publics : aucun droit spécial, simple passage d'appel.
create function public.cancel_invoice(p_invoice_id uuid, p_reason text)
returns public.invoices language sql security invoker set search_path = ''
as $$ select * from app.cancel_invoice(p_invoice_id, p_reason) $$;

create function public.cancel_ticket(p_ticket_id uuid, p_reason text)
returns public.tickets language sql security invoker set search_path = ''
as $$ select * from app.cancel_ticket(p_ticket_id, p_reason) $$;

create function public.create_invoice(
  p_patient_name text, p_items jsonb, p_discount integer default 0, p_advance integer default 0
) returns public.invoices language sql security invoker set search_path = ''
as $$ select * from app.create_invoice(p_patient_name, p_items, p_discount, p_advance) $$;

create function public.create_ticket(
  p_service_id uuid, p_patient_name text, p_quantity integer default 1, p_advance integer default 0
) returns public.tickets language sql security invoker set search_path = ''
as $$ select * from app.create_ticket(p_service_id, p_patient_name, p_quantity, p_advance) $$;

create function public.register_invoice_print(p_invoice_id uuid)
returns public.invoices language sql security invoker set search_path = ''
as $$ select * from app.register_invoice_print(p_invoice_id) $$;

create function public.register_print(p_ticket_id uuid)
returns public.tickets language sql security invoker set search_path = ''
as $$ select * from app.register_print(p_ticket_id) $$;

create function public.set_structure_active(p_structure_id uuid, p_active boolean)
returns public.structures language sql security invoker set search_path = ''
as $$ select * from app.set_structure_active(p_structure_id, p_active) $$;

create function public.set_ticket_total(p_ticket_id uuid, p_total integer)
returns public.tickets language sql security invoker set search_path = ''
as $$ select * from app.set_ticket_total(p_ticket_id, p_total) $$;

-- Les wrappers ne doivent pas être exécutables par anon ni par PUBLIC.
revoke all on all functions in schema public from public, anon;
grant execute on function
  public.cancel_invoice(uuid, text),
  public.cancel_ticket(uuid, text),
  public.create_invoice(text, jsonb, integer, integer),
  public.create_ticket(uuid, text, integer, integer),
  public.register_invoice_print(uuid),
  public.register_print(uuid),
  public.set_structure_active(uuid, boolean),
  public.set_ticket_total(uuid, integer)
to authenticated;
