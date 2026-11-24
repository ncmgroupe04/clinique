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
