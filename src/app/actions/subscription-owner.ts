"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type RenewalState = { message?: string; success?: boolean } | undefined;

export async function declareRenewalPayment(
  _prev: RenewalState,
  formData: FormData,
): Promise<RenewalState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId) return { message: "Aucune structure associée." };

  const reference = String(formData.get("reference") ?? "").trim();
  if (reference.length < 3) return { message: "Référence de paiement requise (3 caractères minimum)." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("structures")
    .update({ renewal_requested: true, renewal_reference: reference })
    .eq("id", user.structureId);
  if (error) return { message: "Enregistrement impossible." };
  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "renewal_payment_declared",
    details: { reference },
  });

  revalidatePath("/abonnement");
  return { success: true, message: "Paiement déclaré. Votre abonnement sera validé après vérification." };
}
