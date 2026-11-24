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
    print_format: formData.get("print_format") ?? undefined,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const printFormat = parsed.data.print_format ?? (parsed.data.paper_width_mm === 58 ? "58" : "80");
  const paperWidth = printFormat === "58" ? 58 : 80;

  const supabase = await createClient();
  const { error } = await supabase
    .from("structures")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      header_text: parsed.data.header_text || null,
      paper_width_mm: paperWidth,
      print_format: printFormat,
    })
    .eq("id", user.structureId);

  if (error) {
    return { message: "Enregistrement impossible." };
  }

  revalidatePath("/reglages");
  revalidatePath("/tableau");
  return { success: true, message: "Réglages enregistrés." };
}

export async function updatePaperWidth(formData: FormData): Promise<void> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return;

  const printFormat = (formData.get("print_format") as string) || (formData.get("paper_width_mm") as string);
  const valid = printFormat === "80" || printFormat === "58" || printFormat === "a6";
  if (!valid) return;

  const paperWidth = printFormat === "58" ? 58 : 80;

  const supabase = await createClient();
  await supabase
    .from("structures")
    .update({ paper_width_mm: paperWidth, print_format: printFormat })
    .eq("id", user.structureId);

  revalidatePath("/tarifs");
  revalidatePath("/reglages");
  revalidatePath("/tickets/nouveau");
  revalidatePath("/tickets");
}