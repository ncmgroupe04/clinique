import { createServiceClient } from "@/lib/supabase/server";

/** Vérifie qu'une fonctionnalité est incluse dans la formule de la structure. */
export async function assertPlanFeature(structureId: string, feature: string): Promise<void> {
  const admin = createServiceClient();
  const { data: structure } = await admin.from("structures").select("plan_id").eq("id", structureId).maybeSingle();
  if (!structure?.plan_id) return; // période d'essai / formule ami
  const { data: plan } = await admin.from("subscription_plans").select("features, is_unlimited").eq("id", structure.plan_id).maybeSingle();
  if (!plan || plan.is_unlimited) return;
  const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
  if (features.length > 0 && !features.includes(feature)) {
    throw new Error(`La fonctionnalité « ${feature} » n'est pas incluse dans votre formule.`);
  }
}

/** Vérifie une limite numérique de formule (ex. max_cashiers). */
export async function assertPlanLimit(structureId: string, kind: "cashier" | "docteur"): Promise<void> {
  const admin = createServiceClient();
  const { data: structure } = await admin.from("structures").select("plan_id").eq("id", structureId).maybeSingle();
  if (!structure?.plan_id) return;
  const col = kind === "cashier" ? "max_cashiers" : "max_docteurs";
  const { data: plan } = await admin.from("subscription_plans").select(`${col}, is_unlimited`).eq("id", structure.plan_id).maybeSingle();
  if (!plan || plan.is_unlimited) return;
  const max = (plan as Record<string, number | null>)[col];
  if (max === null) return;
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("structure_id", structureId)
    .eq("role", kind === "cashier" ? "cashier" : "docteur");
  if ((count ?? 0) >= (max ?? 0)) {
    throw new Error(`Limite de ${kind}s atteinte pour votre formule.`);
  }
}
