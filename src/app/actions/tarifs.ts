"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { assertPlanFeature } from "@/lib/plans";
import {
  createServiceSchema,
  updateServiceSchema,
  type TarifState,
} from "@/lib/validations/tarifs";

export type { TarifState };

export async function createService(
  _prev: TarifState,
  formData: FormData,
): Promise<TarifState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };
  try {
    await assertPlanFeature(user.structureId, "tarifs");
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Fonctionnalité non disponible." };
  }

  const parsed = createServiceSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    structure_id: user.structureId,
    name: parsed.data.name,
    price: parsed.data.price,
  });
  if (error) return { message: "Ajout impossible." };
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "service_created",
    details: { name: parsed.data.name, price: parsed.data.price },
  });

  revalidatePath("/tarifs");
  revalidatePath("/tickets/nouveau");
  return { success: true, message: "Service ajouté." };
}

export async function updateService(
  _prev: TarifState,
  formData: FormData,
): Promise<TarifState> {
  const user = await requireRole("structure_admin", "platform_admin");

  const parsed = updateServiceSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    price: formData.get("price"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ name: parsed.data.name, price: parsed.data.price })
    .eq("id", parsed.data.id);
  if (error) return { message: "Modification impossible." };
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "service_updated",
    details: { service_id: parsed.data.id, name: parsed.data.name, price: parsed.data.price },
  });

  revalidatePath("/tarifs");
  revalidatePath("/tickets/nouveau");
  return { success: true, message: "Service modifié." };
}

export async function toggleService(formData: FormData): Promise<void> {
  const user = await requireRole("structure_admin", "platform_admin");

  const id = formData.get("id");
  const active = formData.get("active") === "true";
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("services")
    .update({ active })
    .eq("id", parsed.data);
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: active ? "service_activated" : "service_deactivated",
    details: { service_id: parsed.data },
  });

  revalidatePath("/tarifs");
  revalidatePath("/tickets/nouveau");
}

export async function deleteService(
  _prev: TarifState,
  formData: FormData,
): Promise<TarifState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Service introuvable." };

  const supabase = await createClient();
  let service: { name: string; structure_id: string } | null = null;
  let client = supabase;
  try {
    const admin = createServiceClient();
    const { data } = await admin
      .from("services")
      .select("name, structure_id")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      service = data;
      client = admin;
    }
  } catch {
    /* la clé service n'est pas disponible : on passe par la session utilisateur */
  }

  if (!service) {
    const { data } = await supabase
      .from("services")
      .select("name, structure_id")
      .eq("id", id)
      .maybeSingle();
    service = data;
  }

  if (!service || service.structure_id !== user.structureId) {
    return { message: "Service introuvable." };
  }

  const { data: used } = await client
    .from("tickets")
    .select("id")
    .eq("structure_id", user.structureId)
    .eq("service_id", id)
    .limit(1);
  if (used && used.length > 0) {
    return { message: "Ce service a déjà été utilisé : désactivez-le plutôt." };
  }

  let { error } = await client.from("services").delete().eq("id", id);
  if (error) {
    // Repli sur la session utilisateur (policy de suppression) si la clé service a échoué.
    const retry = await supabase.from("services").delete().eq("id", id);
    error = retry.error;
  }
  if (error) return { message: "Suppression impossible." };
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "service_deleted",
    details: { service_id: id, name: service.name },
  });

  revalidatePath("/tarifs");
  return { success: true, message: "Service supprimé." };
}