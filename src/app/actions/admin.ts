"use server";

import { revalidatePath } from "next/cache";
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
