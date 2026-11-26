"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type InvoiceState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean; invoiceId?: string }
  | undefined;

export async function createInvoice(
  _prev: InvoiceState,
  formData: FormData,
): Promise<InvoiceState> {
  const user = await requireRole("structure_admin", "cashier", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const patientName = String(formData.get("patient_name") ?? "").trim();
  const itemsJson = String(formData.get("items") ?? "[]");
  const discount = Number(formData.get("discount") ?? 0);
  const advance = Number(formData.get("advance") ?? 0);

  if (!patientName) return { message: "Nom du patient requis." };

  let items: { care_name: string; quantity: number; unit_price: number }[];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { message: "Lignes invalides." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { message: "Au moins un soin requis." };
  }

  const supabase = await createClient();
  let { data, error } = await supabase.rpc("create_invoice", {
    p_patient_name: patientName,
    p_items: items,
    p_discount: discount,
    p_advance: advance,
  });

  // Tolérance si la migration 0037 (colonne cotation) n'est pas encore appliquée.
  if (error && /cotation|column/i.test(error.message ?? "")) {
    const fallbackItems = (items as Array<Record<string, unknown>>).map((item) => {
      const copy: Record<string, unknown> = { ...item };
      delete copy.cotation;
      return copy;
    });
    const retry = await supabase.rpc("create_invoice", {
      p_patient_name: patientName,
      p_items: fallbackItems,
      p_discount: discount,
      p_advance: advance,
    });
    data = retry.data;
    error = retry.error;
  }

  if (error) return { message: error.message ?? "Création impossible." };

  revalidatePath("/factures");
  return { success: true, message: "Facture créée.", invoiceId: (data as { id: string }).id };
}

export async function cancelInvoice(
  _prev: InvoiceState,
  formData: FormData,
): Promise<InvoiceState> {
  const user = await requireRole("structure_admin", "cashier", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return { message: "Facture introuvable." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_invoice", {
    p_invoice_id: id,
    p_reason: reason,
  });
  if (error) return { message: error.message ?? "Annulation impossible." };

  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  return { success: true, message: "Facture annulée." };
}

export async function registerInvoicePrint(formData: FormData): Promise<void> {
  await requireRole("structure_admin", "cashier", "platform_admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("register_invoice_print", { p_invoice_id: id });
  revalidatePath(`/factures/${id}`);
}
