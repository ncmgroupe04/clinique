"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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

  revalidatePath("/tarifs");
  return { success: true, message: "Service ajouté." };
}

export async function updateService(
  _prev: TarifState,
  formData: FormData,
): Promise<TarifState> {
  await requireRole("structure_admin", "platform_admin");

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

  revalidatePath("/tarifs");
  return { success: true, message: "Service modifié." };
}

export async function toggleService(formData: FormData): Promise<void> {
  await requireRole("structure_admin", "platform_admin");

  const id = formData.get("id");
  const active = formData.get("active") === "true";
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("services")
    .update({ active })
    .eq("id", parsed.data);

  revalidatePath("/tarifs");
}

export async function deleteService(
  _prev: TarifState,
  formData: FormData,
): Promise<TarifState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Service introuvable." };

  const admin = createServiceClient();
  const { data: service } = await admin
    .from("services")
    .select("name, structure_id")
    .eq("id", id)
    .maybeSingle();
  if (!service || service.structure_id !== user.structureId) {
    return { message: "Service introuvable." };
  }

  const { data: used } = await admin
    .from("tickets")
    .select("id")
    .eq("service_name", service.name)
    .limit(1);
  console.log("deleteService: id=", id, "service=", JSON.stringify(service), "used=", used?.length);
  if (used && used.length > 0) {
    return { message: "Ce service a déjà été utilisé : désactivez-le plutôt." };
  }

  const { error } = await admin.from("services").delete().eq("id", id);
  if (error) return { message: "Suppression impossible." };

  revalidatePath("/tarifs");
  return { success: true, message: "Service supprimé." };
}