export type PlatformStructure = {
  id: string;
  name: string;
  active: boolean;
  suspended: boolean;
  created_at: string;
  subscription_ends_at: string | null;
  plan_id: string | null;
  registration_fee_paid: boolean;
  renewal_requested: boolean | null;
  renewal_reference: string | null;
};

export type PlatformPlan = {
  id: string;
  name: string;
  monthly_price: number;
  duration_days: number | null;
  active: boolean | null;
};

export type SubscriptionStatus = "actif" | "expire" | "suspendu" | "inactif";

export function subscriptionStatus(s: PlatformStructure, now = new Date()): SubscriptionStatus {
  if (!s.active) return "inactif";
  if (s.suspended) return "suspendu";
  if (!s.subscription_ends_at || new Date(s.subscription_ends_at) < now) return "expire";
  return "actif";
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  actif: "Actif",
  expire: "Expiré",
  suspendu: "Suspendu",
  inactif: "Inactif",
};

export function formatFcfa(v: number): string {
  return `${v.toLocaleString("fr-FR")} F CFA`;
}

export function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvCell).join(";"), ...rows.map((r) => r.map(csvCell).join(";"))].join("\n");
}
