import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import GroupedBarChart from "../grouped-chart";

function fcfa(v: number): string {
  return `${v.toLocaleString("fr-FR")} F CFA`;
}

export default async function TableauPage() {
  await connection();
  const user = await requireUser();
  if (user.role === "platform_admin") redirect("/admin");

  let tickets: { created_at: string; advance: number; total: number; status: string }[] = [];
  let invoices: { created_at: string; advance: number; total: number; status: string }[] = [];

  if (user.structureId) {
    const supabase = await createClient();
    const [{ data: t }, { data: i }] = await Promise.all([
      supabase.from("tickets").select("created_at, advance, total, status").eq("structure_id", user.structureId),
      supabase.from("invoices").select("created_at, advance, total, status").eq("structure_id", user.structureId),
    ]);
    tickets = t ?? [];
    invoices = i ?? [];
  }

  const activeT = tickets.filter((x) => x.status === "actif");
  const activeI = invoices.filter((x) => x.status === "actif");
  const ticketCollected = activeT.reduce((s, x) => s + (x.advance ?? 0), 0);
  const invoiceCollected = activeI.reduce((s, x) => s + (x.advance ?? 0), 0);
  const combined = ticketCollected + invoiceCollected;
  const ticketTotal = activeT.reduce((s, x) => s + (x.total ?? 0), 0);
  const invoiceTotal = activeI.reduce((s, x) => s + (x.total ?? 0), 0);

  const today = new Date().toISOString().slice(0, 10);
  const todayT = activeT.filter((x) => x.created_at.slice(0, 10) === today).reduce((s, x) => s + (x.advance ?? 0), 0);
  const todayI = activeI.filter((x) => x.created_at.slice(0, 10) === today).reduce((s, x) => s + (x.advance ?? 0), 0);

  // Last 7 days, daily collections
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const labels = days.map((d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }));
  const ticketSeries = days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return activeT.filter((x) => x.created_at.slice(0, 10) === key).reduce((s, x) => s + (x.advance ?? 0), 0);
  });
  const invoiceSeries = days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return activeI.filter((x) => x.created_at.slice(0, 10) === key).reduce((s, x) => s + (x.advance ?? 0), 0);
  });
  const combinedSeries = days.map((_, i) => ticketSeries[i] + invoiceSeries[i]);

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Tableau de bord"
        subtitle={`Connecté en tant que ${user.role}.`}
      />

      {/* Accès rapide */}
      <div className="card">
        <p className="text-[13px] font-semibold text-muted">Accès rapide</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(user.role === "structure_admin" || user.role === "cashier") && (
            <>
              <Link href="/tickets/nouveau" className="go" style={{ height: 48, fontSize: 14, borderRadius: 14 }}>
                Nouveau Ticket
              </Link>
              <Link href="/factures/nouvelle" className="go" style={{ height: 48, fontSize: 14, borderRadius: 14 }}>
                Nouvelle Facture
              </Link>
            </>
          )}
          {(user.role === "structure_admin" || user.role === "docteur") && (
            <Link href="/ordonnances" className="go" style={{ height: 48, fontSize: 14, borderRadius: 14 }}>
              Nouvelle Ordonnance
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="card grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Encaissements cumulés", value: fcfa(combined), accent: true },
          { label: "Tickets encaissés", value: fcfa(ticketCollected) },
          { label: "Factures encaissées", value: fcfa(invoiceCollected) },
          { label: "Encaissé aujourd'hui", value: fcfa(todayT + todayI) },
        ].map((k) => (
          <div key={k.label} className="text-center">
            <p className="text-[13px] font-semibold text-muted">{k.label}</p>
            <p className={`mt-1 text-xl font-extrabold ${k.accent ? "text-accent" : "text-ink"}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="card grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Total facturé tickets</p>
          <p className="mt-1 text-lg font-extrabold">{fcfa(ticketTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Total facturé factures</p>
          <p className="mt-1 text-lg font-extrabold">{fcfa(invoiceTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Total facturé cumulé</p>
          <p className="mt-1 text-lg font-extrabold text-accent">{fcfa(ticketTotal + invoiceTotal)}</p>
        </div>
      </div>

      <GroupedBarChart
        title="Évolution des encaissements (7 derniers jours)"
        labels={labels}
        series={[
          { label: "Tickets", color: "#0b7a6b", values: ticketSeries },
          { label: "Factures", color: "#1d4e89", values: invoiceSeries },
          { label: "Cumulé", color: "#f59e0b", values: combinedSeries },
        ]}
      />
    </div>
  );
}
