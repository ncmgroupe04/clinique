import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  periodRange,
  type CaisseData,
  type CaissePeriod,
  type CaisseSummary,
  type DepenseRow,
} from "@/lib/depenses";
import type { OutstandingDocument } from "@/lib/payments";

function ref(prefix: string, year: number, number: number): string {
  return `${prefix} ${year}-${String(number).padStart(4, "0")}`;
}

/**
 * Charge les données de la caisse pour une structure :
 * - encaissements (avances) des tickets et factures actifs sur la période ;
 * - dépenses actives sur la période (le total ignore le filtre catégorie) ;
 * - liste des dépenses filtrée par catégorie ;
 * - restes à recouvrer (documents actifs avec un reste > 0, toutes périodes).
 */
export async function getCaisseData(
  supabase: SupabaseClient,
  structureId: string,
  period: CaissePeriod,
  categorie: string | null,
  range?: { from: string; to: string } | null,
): Promise<CaisseData> {
  const { from, to } = range ?? periodRange(period);
  const fromTs = `${from}T00:00:00`;
  const toTs = `${to}T23:59:59`;

  const [ticketsRes, invoicesRes, depensesRes, outTicketsRes, outInvoicesRes] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("advance")
        .eq("structure_id", structureId)
        .eq("status", "actif")
        .gte("created_at", fromTs)
        .lte("created_at", toTs),
      supabase
        .from("invoices")
        .select("advance")
        .eq("structure_id", structureId)
        .eq("status", "actif")
        .gte("created_at", fromTs)
        .lte("created_at", toTs),
      supabase
        .from("depenses")
        .select("*")
        .eq("structure_id", structureId)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("tickets")
        .select("id, year, number, patient_name, total, advance, remaining, created_at")
        .eq("structure_id", structureId)
        .eq("status", "actif")
        .gt("remaining", 0)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, year, number, patient_name, total, advance, remaining, created_at")
        .eq("structure_id", structureId)
        .eq("status", "actif")
        .gt("remaining", 0)
        .order("created_at", { ascending: false }),
    ]);

  const tickets = (ticketsRes.data ?? []) as { advance: number | null }[];
  const invoices = (invoicesRes.data ?? []) as { advance: number | null }[];
  const allDepenses = (depensesRes.data ?? []) as DepenseRow[];

  const encaisseTickets = tickets.reduce((s, x) => s + (x.advance ?? 0), 0);
  const encaisseFactures = invoices.reduce((s, x) => s + (x.advance ?? 0), 0);
  const activeDepenses = allDepenses.filter((d) => d.status === "actif");
  const depensesTotal = activeDepenses.reduce((s, d) => s + (d.montant ?? 0), 0);

  const summary: CaisseSummary = {
    encaisseTickets,
    encaisseFactures,
    encaisseTotal: encaisseTickets + encaisseFactures,
    depensesTotal,
    solde: encaisseTickets + encaisseFactures - depensesTotal,
    depensesCount: activeDepenses.length,
  };

  const depenses =
    categorie && categorie !== "all"
      ? allDepenses.filter((d) => d.categorie === categorie)
      : allDepenses;

  const outstanding: OutstandingDocument[] = [
    ...((outTicketsRes.data ?? []) as {
      id: string;
      year: number;
      number: number;
      patient_name: string;
      total: number;
      advance: number;
      remaining: number;
      created_at: string;
    }[]).map((t) => ({
      type: "ticket" as const,
      id: t.id,
      reference: ref("Reçu", t.year, t.number),
      patient_name: t.patient_name,
      total: t.total,
      advance: t.advance,
      remaining: t.remaining,
      created_at: t.created_at,
    })),
    ...((outInvoicesRes.data ?? []) as {
      id: string;
      year: number;
      number: number;
      patient_name: string;
      total: number;
      advance: number;
      remaining: number;
      created_at: string;
    }[]).map((i) => ({
      type: "facture" as const,
      id: i.id,
      reference: ref("Facture", i.year, i.number),
      patient_name: i.patient_name,
      total: i.total,
      advance: i.advance,
      remaining: i.remaining,
      created_at: i.created_at,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const outstandingTotal = outstanding.reduce((s, d) => s + d.remaining, 0);

  return {
    summary,
    depenses,
    outstanding,
    outstandingTotal,
    period,
    from,
    to,
    categorie: categorie && categorie !== "all" ? categorie : null,
  };
}
