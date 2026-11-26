"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import * as z from "zod";

const careSchema = z.object({
  name: z.string().min(1, "Nom requis.").max(200).trim(),
  price: z.coerce.number().int().min(0, "Prix invalide."),
  unit: z.enum(["unité", "nuit", "jour", "séance"]).optional().default("unité"),
  category: z.enum(["diagnostic", "intervention", "produit"]).optional().default("intervention"),
});

export type CareState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

export async function createCare(
  _prev: CareState,
  formData: FormData,
): Promise<CareState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const parsed = careSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    unit: formData.get("unit") ?? undefined,
    category: formData.get("category") ?? undefined,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cares").insert({
    structure_id: user.structureId,
    name: parsed.data.name,
    price: parsed.data.price,
    unit: parsed.data.unit,
    category: parsed.data.category,
  });
  if (error) return { message: "Création impossible." };
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "care_created",
    details: { name: parsed.data.name, price: parsed.data.price },
  });

  revalidatePath("/soins");
  return { success: true, message: "Soin ajouté." };
}

export async function updateCare(
  _prev: CareState,
  formData: FormData,
): Promise<CareState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const id = String(formData.get("id") ?? "");
  const parsed = careSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    unit: formData.get("unit") ?? undefined,
    category: formData.get("category") ?? undefined,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cares")
    .update({ name: parsed.data.name, price: parsed.data.price, unit: parsed.data.unit, category: parsed.data.category })
    .eq("id", id)
    .eq("structure_id", user.structureId);
  if (error) return { message: "Mise à jour impossible." };
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "care_updated",
    details: { care_id: id, name: parsed.data.name, price: parsed.data.price },
  });

  revalidatePath("/soins");
  return { success: true, message: "Soin modifié." };
}

export async function toggleCare(formData: FormData): Promise<void> {
  await requireRole("structure_admin", "platform_admin");
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return;
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("cares")
    .update({ active })
    .eq("id", id)
    .eq("structure_id", user.structureId);
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: active ? "care_activated" : "care_deactivated",
    details: { care_id: id },
  });
  revalidatePath("/soins");
}

export async function deleteCare(
  _prev: { message?: string; success?: boolean },
  formData: FormData,
): Promise<{ message?: string; success?: boolean }> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Soin introuvable." };

  const admin = createServiceClient();
  const { data: care } = await admin
    .from("cares")
    .select("name, structure_id")
    .eq("id", id)
    .maybeSingle();
  if (!care || care.structure_id !== user.structureId) {
    return { message: "Soin introuvable." };
  }

  // Ne pas supprimer un soin déjà utilisé dans une facture.
  const { data: used } = await admin
    .from("invoice_items")
    .select("id")
    .eq("care_name", care.name)
    .limit(1);
  if (used && used.length > 0) {
    return { message: "Ce soin a déjà été facturé : désactivez-le plutôt." };
  }

  const { error } = await admin.from("cares").delete().eq("id", id);
  if (error) return { message: "Suppression impossible." };
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "care_deleted",
    details: { care_id: id, name: care.name },
  });

  revalidatePath("/soins");
  return { success: true };
}
