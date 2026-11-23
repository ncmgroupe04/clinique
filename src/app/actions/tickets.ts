"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createTicketSchema, type CreateTicketState } from "@/lib/validations/tickets";

export type { CreateTicketState };

export async function createTicket(
  _prev: CreateTicketState,
  formData: FormData,
): Promise<CreateTicketState> {
  const user = await requireRole("structure_admin", "cashier");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const parsed = createTicketSchema.safeParse({
    patient_name: formData.get("patient_name"),
    service_id: formData.get("service_id") ?? "",
    other_label: formData.get("other_label") ?? "",
    other_price: formData.get("other_price") ?? undefined,
    advance: formData.get("advance") ?? 0,
    total_override: formData.get("total_override") ?? undefined,
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  // Resolve service_id (create an ad-hoc service for "Autre service").
  let serviceId = d.service_id && d.service_id !== "" ? d.service_id : null;
  if (!serviceId) {
    if (!d.other_label || d.other_price === undefined) {
      return { message: "Service requis." };
    }
    const admin = createServiceClient();
    const { data: svc, error: svcErr } = await admin
      .from("services")
      .insert({
        structure_id: user.structureId,
        name: d.other_label,
        price: d.other_price,
        active: true,
      })
      .select("id")
      .single();
    if (svcErr || !svc) return { message: "Création du service impossible." };
    serviceId = svc.id;
  }

  const supabase = await createClient();
  const { data: ticket, error } = await supabase.rpc("create_ticket", {
    p_service_id: serviceId,
    p_patient_name: d.patient_name,
    p_quantity: d.quantity,
    p_advance: d.advance,
  });
  if (error || !ticket) {
    return { message: error?.message ?? "Création du ticket impossible." };
  }

  const ticketId = (ticket as { id: string }).id;

  // Admin may override the total after creation.
  if (
    user.role === "structure_admin" &&
    d.total_override !== undefined &&
    d.total_override !== (ticket as { total: number }).total
  ) {
    await supabase.rpc("set_ticket_total", {
      p_ticket_id: ticketId,
      p_total: d.total_override,
    });
  }

  revalidatePath("/tickets");
  redirect(`/tickets/${ticketId}`);
}

export async function registerPrintAction(ticketId: string): Promise<void> {
  await requireRole("structure_admin", "cashier");
  const supabase = await createClient();
  await supabase.rpc("register_print", { p_ticket_id: ticketId });
  revalidatePath(`/tickets/${ticketId}`);
}

export async function cancelTicketAction(
  _prev: { message?: string; success?: boolean } | undefined,
  formData: FormData,
): Promise<{ message?: string; success?: boolean }> {
  await requireRole("structure_admin", "cashier");
  const ticketId = String(formData.get("ticket_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) {
    return { message: "Motif requis (au moins 3 caractères)." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_ticket", {
    p_ticket_id: ticketId,
    p_reason: reason,
  });
  if (error) return { message: error.message };
  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
  return { success: true, message: "Ticket annulé." };
}