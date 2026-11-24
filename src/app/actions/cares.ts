"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import * as z from "zod";

const careSchema = z.object({
  name: z.string().min(1, "Nom requis.").max(200).trim(),
  price: z.coerce.number().int().min(0, "Prix invalide."),
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
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cares").insert({
    structure_id: user.structureId,
    name: parsed.data.name,
    price: parsed.data.price,
  });
  if (error) return { message: "Création impossible." };

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
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cares")
    .update({ name: parsed.data.name, price: parsed.data.price })
    .eq("id", id)
    .eq("structure_id", user.structureId);
  if (error) return { message: "Mise à jour impossible." };

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
    .update({ active: !active })
    .eq("id", id)
    .eq("structure_id", user.structureId);
  revalidatePath("/soins");
}
