import Link from "next/link";
import { connection } from "next/server";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../../screen-header";
import {
  STATUS_LABELS,
  formatFcfa,
  subscriptionStatus,
  type PlatformPlan,
  type PlatformStructure,
} from "@/lib/platform";

export default async function AbonnementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; plan?: string }>;
}) {
  await connection();
  await requireRole("platform_admin");
  const params = await searchParams;
  const supabase = createServiceClient();
  const [{ data: structures }, { data: plans }] = await Promise.all([
    supabase
      .from("structures")
      .select("id, name, active, suspended, created_at, subscription_ends_at, plan_id, registration_fee_paid, renewal_requested, renewal_reference")
      .order("created_at", { ascending: false }),
    supabase.from("subscription_plans").select("id, name, monthly_price").order("name"),
  ]);

  const all = (structures ?? []) as PlatformStructure[];
  const planMap = new Map(((plans ?? []) as PlatformPlan[]).map((p) => [p.id, p]));
  const rows = all
    .map((s) => ({ s, status: subscriptionStatus(s), plan: s.plan_id ? planMap.get(s.plan_id) : null }))
    .filter((r) => (params.status ? r.status === params.status : true))
    .filter((r) => (params.plan ? r.s.plan_id === params.plan : true));

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Abonnements"
        subtitle="Échéances, statuts, moyens de paiement et relances des structures."
      >
        <Link
          href="/api/admin/export?type=abonnements"
          className="btn-secondary"
          style={{ height: 44, padding: "0 16px", borderRadius: 12, fontSize: 13, width: "auto" }}
        >
          Exporter CSV
        </Link>
      </ScreenHeader>

      <form method="get" className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="lbl" htmlFor="status">Statut</label>
          <select id="status" name="status" className="input" defaultValue={params.status ?? ""} style={{ width: 180 }}>
            <option value="">Tous</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl" htmlFor="plan">Formule</label>
          <select id="plan" name="plan" className="input" defaultValue={params.plan ?? ""} style={{ width: 180 }}>
            <option value="">Toutes</option>
            {(plans ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary" style={{ height: 42, padding: "0 18px", borderRadius: 12, fontSize: 13 }}>Filtrer</button>
        <Link href="/admin/abonnements" className="btn-secondary" style={{ height: 42, padding: "0 14px", borderRadius: 12, fontSize: 13 }}>Réinitialiser</Link>
      </form>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr className="border-b border-border">
              <th className="py-3 pr-3">Structure</th>
              <th className="py-3 pr-3">Formule</th>
              <th className="py-3 pr-3">Statut</th>
              <th className="py-3 pr-3">Échéance</th>
              <th className="py-3 pr-3">Paiement</th>
              <th className="py-3 pr-3">Montant</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, status, plan }) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-3 font-semibold">{s.name}</td>
                <td className="py-3 pr-3">{plan?.name ?? "—"}</td>
                <td className="py-3 pr-3">
                  <span className={`cd ${status === "actif" ? "" : "off"}`} style={{ width: 88 }}>{STATUS_LABELS[status]}</span>
                </td>
                <td className="py-3 pr-3 text-xs text-muted">
                  {s.subscription_ends_at ? new Date(s.subscription_ends_at).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="py-3 pr-3 text-xs">
                  {s.renewal_requested ? `Déclaré · ${s.renewal_reference ?? "—"}` : "—"}
                </td>
                <td className="py-3 pr-3 font-bold">{formatFcfa(plan?.monthly_price ?? 25000)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="py-8 text-center text-muted">Aucune structure.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
