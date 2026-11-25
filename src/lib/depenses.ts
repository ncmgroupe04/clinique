import type { OutstandingDocument } from "@/lib/payments";

export const DEPENSE_CATEGORIES = [
  "Fournitures",
  "Loyer",
  "Salaires",
  "Entretien",
  "Transport",
  "Autre",
] as const;

export type DepenseCategorie = (typeof DEPENSE_CATEGORIES)[number];

export type CaissePeriod = "today" | "7d" | "30d" | "month" | "all";

export const CAISSE_PERIODS: { value: CaissePeriod; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "month", label: "Ce mois" },
  { value: "all", label: "Tout" },
];

export type DepenseRow = {
  id: string;
  structure_id: string;
  date: string;
  libelle: string;
  categorie: string;
  montant: number;
  note: string | null;
  status: "actif" | "annule";
  cancel_reason: string | null;
  created_by: string;
  created_at: string;
};

export type CaisseSummary = {
  encaisseTickets: number;
  encaisseFactures: number;
  encaisseTotal: number;
  depensesTotal: number;
  solde: number;
  depensesCount: number;
};

export type CaisseData = {
  summary: CaisseSummary;
  depenses: DepenseRow[];
  outstanding: OutstandingDocument[];
  outstandingTotal: number;
  period: CaissePeriod;
  categorie: string | null;
};

/** Bornes de dates (UTC, comme le reste de l'application) pour une période. */
export function periodRange(period: CaissePeriod): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (period === "all") return { from: "1970-01-01", to };

  const d = new Date(now);
  switch (period) {
    case "7d":
      d.setDate(d.getDate() - 6);
      break;
    case "30d":
      d.setDate(d.getDate() - 29);
      break;
    case "month":
      d.setDate(1);
      break;
    case "today":
    default:
      break;
  }
  return { from: d.toISOString().slice(0, 10), to };
}

export function isCaissePeriod(value: string | null | undefined): value is CaissePeriod {
  return (
    value === "today" ||
    value === "7d" ||
    value === "30d" ||
    value === "month" ||
    value === "all"
  );
}

export function formatCfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} F CFA`;
}
