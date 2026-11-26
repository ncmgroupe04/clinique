import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { toCsv, subscriptionStatus } from "@/lib/platform";
import type { PlatformStructure } from "@/lib/platform";

function csvResponse(csv: string, name: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
    },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "platform_admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const type = new URL(request.url).searchParams.get("type") ?? "abonnements";
  const supabase = createServiceClient();

  if (type === "abonnements") {
    const { data } = await supabase
      .from("structures")
      .select("name, active, suspended, subscription_ends_at, renewal_requested, renewal_reference, created_at, plan_id");
    const { data: plans } = await supabase.from("subscription_plans").select("id, name, monthly_price");
    const planMap = new Map((plans ?? []).map((p) => [p.id, p]));
    const rows = (data ?? []).map((s) => {
      const st = s as PlatformStructure;
      return [
        s.name,
        subscriptionStatus(st),
        planMap.get(st.plan_id ?? "")?.name ?? "—",
        s.subscription_ends_at ?? "",
        s.renewal_reference ?? "",
        planMap.get(st.plan_id ?? "")?.monthly_price ?? 25000,
      ];
    });
    return csvResponse(toCsv(["Structure", "Statut", "Formule", "Échéance", "Référence paiement", "Montant"], rows), "abonnements");
  }

  if (type === "rapports") {
    const { data: invoices } = await supabase.from("platform_invoices").select("structure_id, period, amount, status, issued_at");
    const { data: structures } = await supabase.from("structures").select("id, name");
    const names = new Map((structures ?? []).map((s) => [s.id, s.name]));
    const rows = (invoices ?? []).map((i) => [names.get(i.structure_id) ?? "—", i.period, i.amount, i.status, i.issued_at]);
    return csvResponse(toCsv(["Structure", "Période", "Montant", "Statut", "Émise le"], rows), "rapports");
  }

  if (type === "journal") {
    const { data } = await supabase
      .from("audit_log")
      .select("created_at, action, structure_id, user_id, ticket_id, details")
      .order("created_at", { ascending: false })
      .limit(5000);
    const rows = (data ?? []).map((l) => [l.created_at, l.action, l.structure_id ?? "", l.user_id ?? "", l.ticket_id ?? "", JSON.stringify(l.details ?? {})]);
    return csvResponse(toCsv(["Date", "Action", "Structure", "Utilisateur", "Document", "Détails"], rows), "journal");
  }

  return NextResponse.json({ error: "Type inconnu." }, { status: 400 });
}
