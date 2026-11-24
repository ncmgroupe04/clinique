"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function toggleStructureActive(formData: FormData): Promise<void> {
  await requireRole("platform_admin");

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const supabase = createServiceClient();
  await supabase
    .from("structures")
    .update({ active: !active })
    .eq("id", id);

  revalidatePath("/admin");
}

export async function updateSubscription(formData: FormData): Promise<void> {
  await requireRole("platform_admin");

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

  revalidatePath("/admin");
}

export async function toggleSuspended(formData: FormData): Promise<void> {
  await requireRole("platform_admin");

  const id = String(formData.get("id") ?? "");
  const suspended = formData.get("suspended") === "true";
  if (!id) return;

  const supabase = createServiceClient();
  await supabase
    .from("structures")
    .update({ suspended: !suspended })
    .eq("id", id);

  revalidatePath("/admin");
}

export async function toggleRegistrationFee(formData: FormData): Promise<void> {
  await requireRole("platform_admin");

  const id = String(formData.get("id") ?? "");
  const paid = formData.get("paid") === "true";
  if (!id) return;

  const supabase = createServiceClient();
  await supabase
    .from("structures")
    .update({ registration_fee_paid: !paid })
    .eq("id", id);

  revalidatePath("/admin");
}

export async function createPlan(formData: FormData): Promise<void> {
  await requireRole("platform_admin");

  const name = String(formData.get("name") ?? "").trim();
  const monthlyPrice = Number(formData.get("monthly_price"));
  const registrationFee = 50000;
  const durationDays = Number(formData.get("duration_days"));
  if (!name || !Number.isFinite(monthlyPrice) || !Number.isFinite(registrationFee) || !Number.isFinite(durationDays)) return;

  const supabase = createServiceClient();
  await supabase.from("subscription_plans").insert({
    name,
    monthly_price: monthlyPrice,
    registration_fee: registrationFee,
    duration_days: durationDays,
  });

  revalidatePath("/admin");
  revalidateTag("plans", "max");
}

export async function togglePlanActive(formData: FormData): Promise<void> {
  await requireRole("platform_admin");

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const supabase = createServiceClient();
  await supabase.from("subscription_plans").update({ active: !active }).eq("id", id);

  revalidatePath("/admin");
  revalidateTag("plans", "max");
}

export async function validateRegistration(formData: FormData): Promise<void> {
  await requireRole("platform_admin");
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

  revalidatePath("/admin/inscriptions");
  revalidatePath("/admin");
}

export async function rejectRegistration(formData: FormData): Promise<void> {
  await requireRole("platform_admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createServiceClient();
  await supabase.from("structures").update({ active: false, suspended: true }).eq("id", id);

  revalidatePath("/admin/inscriptions");
  revalidatePath("/admin");
}
export async function deletePlan(formData: FormData): Promise<void> {
  await requireRole("platform_admin");

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

  revalidatePath("/admin");
  revalidateTag("plans", "max");
}
