import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import FacturesClient from "./factures-client";
import Link from "next/link";

export default async function FacturesPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier" && user.role !== "platform_admin") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("structure_id", user.structureId)
    .order("created_at", { ascending: false })
    .limit(200);

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayInvoices } = await supabase
    .from("invoices")
    .select("total, advance, remaining, status")
    .eq("structure_id", user.structureId)
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  const totals = {
    count: todayInvoices?.length ?? 0,
    total: (todayInvoices ?? []).filter((i) => i.status === "actif").reduce((s, i) => s + (i.total ?? 0), 0),
    collected: (todayInvoices ?? []).filter((i) => i.status === "actif").reduce((s, i) => s + (i.advance ?? 0), 0),
    remaining: (todayInvoices ?? []).filter((i) => i.status === "actif").reduce((s, i) => s + (i.remaining ?? 0), 0),
  };

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Factures" subtitle="Historique et caisse du jour.">
        <Link href="/factures/nouvelle" className="btn-primary" style={{ height: 48, padding: "0 20px", borderRadius: 14, fontSize: 14, width: "auto" }}>
          + Nouvelle facture
        </Link>
      </ScreenHeader>
      {/* Tickets tab removed */}
      <div className="card grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="text-center"><p className="text-[13px] font-semibold text-muted">Factures aujourd&apos;hui</p><p className="mt-1 text-xl font-extrabold text-ink">{totals.count}</p></div>
        <div className="text-center"><p className="text-[13px] font-semibold text-muted">Total</p><p className="mt-1 text-xl font-extrabold text-ink">{totals.total.toLocaleString("fr-FR")} F</p></div>
        <div className="text-center"><p className="text-[13px] font-semibold text-muted">Encaissé</p><p className="mt-1 text-xl font-extrabold text-ink">{totals.collected.toLocaleString("fr-FR")} F</p></div>
        <div className="text-center"><p className="text-[13px] font-semibold text-muted">Restes</p><p className="mt-1 text-xl font-extrabold text-ink">{totals.remaining.toLocaleString("fr-FR")} F</p></div>
      </div>
      <FacturesClient invoices={invoices ?? []} />
    </div>
  );
}
