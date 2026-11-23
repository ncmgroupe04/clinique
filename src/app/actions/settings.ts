"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema, type SettingsState } from "@/lib/validations/settings";

export type { SettingsState };

export async function updateSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) {
    return { message: "Aucune structure associée." };
  }

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    header_text: formData.get("header_text") ?? "",
    paper_width_mm: formData.get("paper_width_mm"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("structures")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      header_text: parsed.data.header_text || null,
      paper_width_mm: parsed.data.paper_width_mm,
    })
    .eq("id", user.structureId);

  if (error) {
    return { message: "Enregistrement impossible." };
  }

  revalidatePath("/reglages");
  revalidatePath("/tableau");
  return { success: true, message: "Réglages enregistrés." };
}