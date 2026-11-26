"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const nameSchema = z.string().trim().min(1, "Nom requis.").max(80);

export type CategoryState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createCareCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { errors: { name: parsed.error.issues.map((i) => i.message) } };
  const slug = slugify(parsed.data);
  if (!slug) return { errors: { name: ["Nom invalide."] } };

  const supabase = await createClient();
  const { error } = await supabase.from("care_categories").insert({
    structure_id: user.structureId,
    name: parsed.data,
    slug,
  });
  if (error) return { message: "Cette catégorie existe déjà ou l'ajout est impossible." };

  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "care_category_created",
    details: { name: parsed.data, slug },
  });
  revalidatePath("/soins");
  return { success: true, message: "Catégorie ajoutée." };
}

export async function updateCareCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const id = String(formData.get("id") ?? "");
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { errors: { name: parsed.error.issues.map((i) => i.message) } };
  if (!id) return { message: "Catégorie introuvable." };
  const slug = slugify(parsed.data);
  if (!slug) return { errors: { name: ["Nom invalide."] } };

  const admin = createServiceClient();
  const { data: category } = await admin
    .from("care_categories")
    .select("structure_id, slug")
    .eq("id", id)
    .maybeSingle();
  if (!category || category.structure_id !== user.structureId) {
    return { message: "Catégorie introuvable." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("care_categories")
    .update({ name: parsed.data, slug })
    .eq("id", id);
  if (error) return { message: "Cette catégorie existe déjà ou la modification est impossible." };

  // On conserve la cohérence des soins déjà rattachés à cette catégorie.
  if (slug !== category.slug) {
    await admin.from("cares").update({ category: slug })
      .eq("structure_id", user.structureId)
      .eq("category", category.slug);
  }

  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "care_category_updated",
    details: { category_id: id, name: parsed.data, slug },
  });
  revalidatePath("/soins");
  return { success: true, message: "Catégorie modifiée." };
}

export async function toggleCareCategory(formData: FormData): Promise<void> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return;
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("care_categories").update({ active }).eq("id", id);
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: active ? "care_category_activated" : "care_category_deactivated",
    details: { category_id: id },
  });
  revalidatePath("/soins");
}

export async function deleteCareCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Catégorie introuvable." };

  const admin = createServiceClient();
  const { data: category } = await admin
    .from("care_categories")
    .select("structure_id, slug")
    .eq("id", id)
    .maybeSingle();
  if (!category || category.structure_id !== user.structureId) {
    return { message: "Catégorie introuvable." };
  }

  const { data: used } = await admin
    .from("cares")
    .select("id")
    .eq("structure_id", user.structureId)
    .eq("category", category.slug)
    .limit(1);
  if (used && used.length > 0) {
    return { message: "Cette catégorie est utilisée par des soins : désactivez-la plutôt." };
  }

  const { error } = await admin.from("care_categories").delete().eq("id", id);
  if (error) return { message: "Suppression impossible." };
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "care_category_deleted",
    details: { category_id: id, slug: category.slug },
  });
  revalidatePath("/soins");
  return { success: true, message: "Catégorie supprimée." };
}
