import { connection } from "next/server";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { generatePlatformInvoices, markInvoicePaid } from "@/app/actions/platform";
import ScreenHeader from "../../screen-header";
import { formatFcfa } from "@/lib/platform";

export default async function FacturationPage() {
  await connection();
  await requireRole("platform_admin");
  const supabase = createServiceClient();
  const [{ data: invoices }, { data: structures }] = await Promise.all([
    supabase
      .from("platform_invoices")
      .select("id, structure_id, period, amount, status, issued_at, paid_at")
      .order("issued_at", { ascending: false }),
    supabase.from("structures").select("id, name").order("name"),
  ]);
  const names = new Map((structures ?? []).map((s) => [s.id, s.name]));
  const period = new Date().toISOString().slice(0, 7);
  const total = (invoices ?? []).reduce((s, i) => s + i.amount, 0);
  const paid = (invoices ?? []).filter((i) => i.status === "payee").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Facturation plateforme" subtitle="Factures mensuelles générées pour les structures." />

      <div className="card grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="text-center"><p className="text-[13px] font-semibold text-muted">Factures</p><p className="mt-1 text-xl font-extrabold">{invoices?.length ?? 0}</p></div>
        <div className="text-center"><p className="text-[13px] font-semibold text-muted">Total émis</p><p className="mt-1 text-xl font-extrabold">{formatFcfa(total)}</p></div>
        <div className="text-center"><p className="text-[13px] font-semibold text-muted">Encaissé</p><p className="mt-1 text-xl font-extrabold text-accent">{formatFcfa(paid)}</p></div>
      </div>

      <form action={generatePlatformInvoices} className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="lbl" htmlFor="period">Période (AAAA-MM)</label>
          <input id="period" name="period" defaultValue={period} className="input" style={{ width: 180 }} pattern="\d{4}-\d{2}" required />
        </div>
        <button type="submit" className="btn-primary" style={{ height: 42, padding: "0 18px", borderRadius: 12, fontSize: 13 }}>Générer les factures du mois</button>
      </form>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr className="border-b border-border">
              <th className="py-3 pr-3">Structure</th>
              <th className="py-3 pr-3">Période</th>
              <th className="py-3 pr-3">Montant</th>
              <th className="py-3 pr-3">Statut</th>
              <th className="py-3 pr-3">Date</th>
              <th className="py-3 pr-3" />
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-3 font-semibold">{names.get(inv.structure_id) ?? "—"}</td>
                <td className="py-3 pr-3">{inv.period}</td>
                <td className="py-3 pr-3 font-bold">{formatFcfa(inv.amount)}</td>
                <td className="py-3 pr-3"><span className={`cd ${inv.status === "payee" ? "" : "off"}`} style={{ width: 90 }}>{inv.status === "payee" ? "Payée" : "En attente"}</span></td>
                <td className="py-3 pr-3 text-xs text-muted">{new Date(inv.issued_at).toLocaleDateString("fr-FR")}</td>
                <td className="py-3 pr-3">
                  {inv.status !== "payee" && (
                    <form action={markInvoicePaid}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button type="submit" className="text-xs font-semibold text-accent hover:underline">Marquer payée</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!invoices?.length && <tr><td colSpan={6} className="py-8 text-center text-muted">Aucune facture générée.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
