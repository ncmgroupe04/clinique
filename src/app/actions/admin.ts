"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function toggleStructureActive(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin");

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const supabase = createServiceClient();
  await supabase
    .from("structures")
    .update({ active: !active })
    .eq("id", id);
  await logAudit({
    structureId: id,
    userId: user.id,
    action: active ? "structure_deactivated" : "structure_activated",
    details: { structure_id: id },
  });

  revalidatePath("/admin");
}

export async function updateSubscription(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + 30);

  const supabase = createServiceClient();
  await supabase
    .from("structures")
    .update({
      plan: "standard",
      subscription_ends_at: endsAt.toISOString(),
    })
    .eq("id", id);
  await logAudit({
    structureId: id,
    userId: user.id,
    action: "subscription_updated",
    details: { structure_id: id, plan: "standard", duration_days: 30 },
  });

  revalidatePath("/admin");
}

export async function toggleSuspended(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin");

  const id = String(formData.get("id") ?? "");
  const suspended = formData.get("suspended") === "true";
  if (!id) return;

  const supabase = createServiceClient();
  await supabase
    .from("structures")
    .update({ suspended: !suspended })
    .eq("id", id);
  await logAudit({
    structureId: id,
    userId: user.id,
    action: suspended ? "structure_unsuspended" : "structure_suspended",
    details: { structure_id: id },
  });

  revalidatePath("/admin");
}

export async function toggleRegistrationFee(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin");

  const id = String(formData.get("id") ?? "");
  const paid = formData.get("paid") === "true";
  if (!id) return;

  const supabase = createServiceClient();
  await supabase
    .from("structures")
    .update({ registration_fee_paid: !paid })
    .eq("id", id);
  await logAudit({
    structureId: id,
    userId: user.id,
    action: paid ? "registration_fee_invalidated" : "registration_fee_validated",
    details: { structure_id: id },
  });

  revalidatePath("/admin");
}

export async function createPlan(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin");

  const name = String(formData.get("name") ?? "").trim();
  const monthlyPrice = Number(formData.get("monthly_price"));
  const registrationFee = 50000;
  const durationDays = Number(formData.get("duration_days"));
  const maxCashiers = formData.get("max_cashiers") === "" ? null : Number(formData.get("max_cashiers"));
  const maxDocteurs = formData.get("max_docteurs") === "" ? null : Number(formData.get("max_docteurs"));
  const isUnlimited = formData.get("is_unlimited") === "true";
  const isPublic = formData.get("is_public") === "true";
  const maxDocuments = formData.get("max_documents_per_month") === "" ? null : Number(formData.get("max_documents_per_month"));
  const features = formData.getAll("features").map(String);
  if (!name || !Number.isFinite(monthlyPrice) || !Number.isFinite(durationDays)) return;

  const supabase = createServiceClient();
  await supabase.from("subscription_plans").insert({
    name,
    monthly_price: monthlyPrice,
    registration_fee: registrationFee,
    duration_days: durationDays,
    max_cashiers: isUnlimited ? null : maxCashiers,
    max_docteurs: isUnlimited ? null : maxDocteurs,
    is_unlimited: isUnlimited,
    is_public: isPublic,
    max_documents_per_month: isUnlimited ? null : maxDocuments,
    features,
  });
  await logAudit({
    userId: user.id,
    action: "plan_created",
    details: { name, monthly_price: monthlyPrice, is_public: isPublic },
  });

  revalidatePath("/admin");
  revalidateTag("plans", "max");
}

export async function updatePlan(
  _prev: { message?: string; success?: boolean },
  formData: FormData,
): Promise<{ message?: string; success?: boolean }> {
  const user = await requireRole("platform_admin");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { message: "Champs requis." };

  const monthlyPrice = Number(formData.get("monthly_price"));
  const durationDays = Number(formData.get("duration_days"));
  const maxCashiers = formData.get("max_cashiers") === "" ? null : Number(formData.get("max_cashiers"));
  const maxDocteurs = formData.get("max_docteurs") === "" ? null : Number(formData.get("max_docteurs"));
  const isUnlimited = formData.get("is_unlimited") === "true";
  const isPublic = formData.get("is_public") === "true";
  const maxDocuments = formData.get("max_documents_per_month") === "" ? null : Number(formData.get("max_documents_per_month"));
  const features = formData.getAll("features").map(String);
  if (!Number.isFinite(monthlyPrice) || !Number.isFinite(durationDays)) return { message: "Valeurs invalides." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("subscription_plans")
    .update({
      name,
      monthly_price: monthlyPrice,
      duration_days: durationDays,
      max_cashiers: isUnlimited ? null : maxCashiers,
      max_docteurs: isUnlimited ? null : maxDocteurs,
      is_unlimited: isUnlimited,
      is_public: isPublic,
      max_documents_per_month: isUnlimited ? null : maxDocuments,
      features,
    })
    .eq("id", id);
  if (error) return { message: "Mise à jour impossible." };
  await logAudit({
    userId: user.id,
    action: "plan_updated",
    details: { plan_id: id, name, monthly_price: monthlyPrice },
  });

  revalidatePath("/admin/formules");
  revalidateTag("plans", "max");
  return { success: true };
}

export async function togglePlanActive(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin");

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const supabase = createServiceClient();
  await supabase.from("subscription_plans").update({ active: !active }).eq("id", id);
  await logAudit({
    userId: user.id,
    action: active ? "plan_deactivated" : "plan_activated",
    details: { plan_id: id },
  });

  revalidatePath("/admin");
  revalidateTag("plans", "max");
}

export async function validateRegistration(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin");
  const id = String(formData.get("id") ?? "");
  console.log("validateRegistration id=", id);
  if (!id) return;

  const supabase = createServiceClient();
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + 30);
  const { error } = await supabase
    .from("structures")
    .update({ registration_fee_paid: true, active: true, suspended: false, subscription_ends_at: endsAt.toISOString() })
    .eq("id", id);
  console.log("validateRegistration error=", error?.message);
  await logAudit({
    structureId: id,
    userId: user.id,
    action: "registration_validated",
    details: { structure_id: id, subscription_ends_at: endsAt.toISOString() },
  });

  revalidatePath("/admin/inscriptions");
  revalidatePath("/admin");
}

export async function rejectRegistration(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createServiceClient();
  await supabase.from("structures").update({ active: false, suspended: true }).eq("id", id);
  await logAudit({
    structureId: id,
    userId: user.id,
    action: "registration_rejected",
    details: { structure_id: id },
  });

  revalidatePath("/admin/inscriptions");
  revalidatePath("/admin");
}
export async function deletePlan(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createServiceClient();
  // Réaffecter les structures liées au plan Standard avant suppression
  const { data: standard } = await supabase
    .from("subscription_plans")
    .select("id")
    .neq("id", id)
    .limit(1)
    .maybeSingle();
  if (standard?.id) {
    await supabase.from("structures").update({ plan_id: standard.id }).eq("plan_id", id);
  }
  await supabase.from("subscription_plans").delete().eq("id", id);
  await logAudit({
    userId: user.id,
    action: "plan_deleted",
    details: { plan_id: id },
  });

  revalidatePath("/admin");
  revalidateTag("plans", "max");
}
