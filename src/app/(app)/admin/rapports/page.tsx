import Link from "next/link";
import { connection } from "next/server";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../../screen-header";
import BarChart, { type ChartDatum } from "../chart";
import { formatFcfa, subscriptionStatus, type PlatformStructure } from "@/lib/platform";

export default async function RapportsPage() {
  await connection();
  await requireRole("platform_admin");
  const supabase = createServiceClient();
  const [{ data: structures }, { data: plans }, { data: platformInvoices }, { data: tickets }, { data: invoices }] =
    await Promise.all([
      supabase.from("structures").select("id, name, active, suspended, subscription_ends_at, plan_id, created_at"),
      supabase.from("subscription_plans").select("id, name, monthly_price"),
      supabase.from("platform_invoices").select("amount, status"),
      supabase.from("tickets").select("advance, created_at, status"),
      supabase.from("invoices").select("advance, created_at, status"),
    ]);

  const planMap = new Map((plans ?? []).map((p) => [p.id, p]));
  const now = new Date();
  const active = (structures ?? []).filter((s) => subscriptionStatus(s as PlatformStructure, now) === "actif");
  const mrr = active.reduce((s, x) => s + (x.plan_id ? planMap.get(x.plan_id)?.monthly_price ?? 25000 : 25000), 0);
  const billed = (platformInvoices ?? []).reduce((s, i) => s + i.amount, 0);
  const collected = (platformInvoices ?? []).filter((i) => i.status === "payee").reduce((s, i) => s + i.amount, 0);
  const ticketsCount = (tickets ?? []).filter((t) => t.status === "actif").length;
  const invoicesCount = (invoices ?? []).filter((i) => i.status === "actif").length;

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Rapports" subtitle="Revenus, utilisation et répartition de la plateforme.">
        <Link href="/api/admin/export?type=rapports" className="btn-secondary" style={{ height: 44, padding: "0 16px", borderRadius: 12, fontSize: 13, width: "auto" }}>Exporter CSV</Link>
      </ScreenHeader>

      <div className="card grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "MRR", value: formatFcfa(mrr) },
          { label: "Facturé", value: formatFcfa(billed) },
          { label: "Encaissé", value: formatFcfa(collected) },
          { label: "Tickets / factures", value: `${ticketsCount} / ${invoicesCount}` },
        ].map((k) => (
          <div key={k.label} className="text-center"><p className="text-[13px] font-semibold text-muted">{k.label}</p><p className="mt-1 text-xl font-extrabold text-ink">{k.value}</p></div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <BarChart
          title="Statut des abonnements"
          data={[
            { label: "Actifs", value: active.length, color: "#0b7a6b" },
            { label: "Expirés", value: (structures ?? []).filter((s) => subscriptionStatus(s as PlatformStructure, now) === "expire").length, color: "#dc2626" },
            { label: "Suspendus", value: (structures ?? []).filter((s) => s.suspended).length, color: "#f59e0b" },
          ] as ChartDatum[]}
        />
        <BarChart
          title="Formules utilisées"
          data={(plans ?? []).map((p, i) => ({
            label: p.name,
            value: (structures ?? []).filter((s) => s.plan_id === p.id).length,
            color: ["#0b7a6b", "#1d4e89", "#6b4a00", "#8c2f3d", "#4b3b7a"][i % 5],
          })) as ChartDatum[]}
        />
      </div>
    </div>
  );
}
