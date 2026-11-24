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
  const plan = String(formData.get("plan") ?? "essai");
  const days = Number(formData.get("days") ?? 30);
  const suspended = formData.get("suspended") === "true";
  if (!id) return;

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + (Number.isFinite(days) ? days : 30));

  const supabase = createServiceClient();
  await supabase
    .from("structures")
    .update({
      plan,
      subscription_ends_at: endsAt.toISOString(),
      suspended,
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
