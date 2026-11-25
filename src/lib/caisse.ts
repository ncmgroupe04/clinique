import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  periodRange,
  type CaisseData,
  type CaissePeriod,
  type CaisseSummary,
  type DepenseRow,
} from "@/lib/depenses";

/**
 * Charge les données de la caisse pour une structure :
 * - encaissements (avances) des tickets et factures actifs sur la période ;
 * - dépenses actives sur la période (le total ignore le filtre catégorie) ;
 * - liste des dépenses filtrée par catégorie.
 */
export async function getCaisseData(
  supabase: SupabaseClient,
  structureId: string,
  period: CaissePeriod,
  categorie: string | null,
): Promise<CaisseData> {
  const { from, to } = periodRange(period);
  const fromTs = `${from}T00:00:00`;
  const toTs = `${to}T23:59:59`;

  const [ticketsRes, invoicesRes, depensesRes] = await Promise.all([
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

  return {
    summary,
    depenses,
    period,
    categorie: categorie && categorie !== "all" ? categorie : null,
  };
}
