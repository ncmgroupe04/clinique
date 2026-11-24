import { createServiceClient } from "@/lib/supabase/server";

/** Vérifie le quota mensuel de documents (tickets + factures) de la structure. */
export async function assertDocumentQuota(structureId: string): Promise<void> {
  const admin = createServiceClient();
  const { data: structure } = await admin
    .from("structures")
    .select("plan_id")
    .eq("id", structureId)
    .maybeSingle();
  if (!structure?.plan_id) return;

  const { data: plan } = await admin
    .from("subscription_plans")
    .select("name, max_documents_per_month")
    .eq("id", structure.plan_id)
    .maybeSingle();
  if (!plan || plan.max_documents_per_month === null) return;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [{ count: tickets }, { count: invoices }] = await Promise.all([
    admin.from("tickets").select("id", { count: "exact", head: true }).eq("structure_id", structureId).gte("created_at", monthStart),
    admin.from("invoices").select("id", { count: "exact", head: true }).eq("structure_id", structureId).gte("created_at", monthStart),
  ]);

  const used = (tickets ?? 0) + (invoices ?? 0);
  if (used >= plan.max_documents_per_month) {
    throw new Error(
      `Quota mensuel atteint pour la formule ${plan.name} (${plan.max_documents_per_month} documents). Contactez votre administrateur.`,
    );
  }
}
