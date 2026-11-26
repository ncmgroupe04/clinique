import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { formatCfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import NotificationsClient, { type NotificationAlert } from "./notifications-client";

const DAY_MS = 86_400_000;
const SUBSCRIPTION_NOTICE_DAYS = 30;

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
}

export default async function NotificationsPage() {
  await connection();
  const user = await requireUser();
  if (user.role === "platform_admin") redirect("/admin");
  if (!user.structureId) redirect("/tableau");

  const structureId = user.structureId;
  const supabase = await createClient();

  // Toutes les requêtes sont scopées sur la structure courante (aucune table supplémentaire).
  const [
    { data: structure },
    { data: unpaidInvoices },
    { data: unpaidTickets },
    { data: prescriptions },
    { count: medicationCount },
  ] = await Promise.all([
    supabase
      .from("structures")
      .select("name, subscription_ends_at, active, suspended")
      .eq("id", structureId)
      .single(),
    supabase
      .from("invoices")
      .select("id, patient_name, remaining, created_at")
      .eq("structure_id", structureId)
      .eq("status", "actif")
      .gt("remaining", 0),
    supabase
      .from("tickets")
      .select("id, patient_name, remaining, created_at")
      .eq("structure_id", structureId)
      .eq("status", "actif")
      .gt("remaining", 0),
    supabase
      .from("prescriptions")
      .select("id, patient_name, created_at")
      .eq("structure_id", structureId)
      .eq("status", "actif")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("medications").select("id", { count: "exact", head: true }),
  ]);

  const alerts: NotificationAlert[] = [];
  const now = new Date();

  // 1. Abonnement : échéance à moins de 30 jours (danger si déjà dépassée).
  if (structure?.subscription_ends_at) {
    const endsAt = new Date(structure.subscription_ends_at);
    const horizon = new Date(now.getTime() + SUBSCRIPTION_NOTICE_DAYS * DAY_MS);
    if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() < horizon.getTime()) {
      const expired = endsAt.getTime() < now.getTime();
      const days = Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS);
      const date = formatDate(structure.subscription_ends_at);
      alerts.push({
        id: "subscription",
        severity: expired ? "danger" : "warning",
        title: expired ? "Abonnement expiré" : "Abonnement proche de l'échéance",
        description: expired
          ? `L'abonnement de ${structure.name ?? "votre structure"} a expiré le ${date}. Renouvelez-le pour continuer à utiliser l'application.`
          : `L'abonnement expire le ${date} (dans ${days} jour${days > 1 ? "s" : ""}). Pensez à le renouveler.`,
        href: "/abonnement",
        label: "Renouveler l'abonnement",
      });
    }
  }

  // 2. Factures impayées.
  const invoices = unpaidInvoices ?? [];
  if (invoices.length > 0) {
    const total = invoices.reduce((sum, invoice) => sum + (Number(invoice.remaining) || 0), 0);
    alerts.push({
      id: "unpaid-invoices",
      severity: "warning",
      title: "Factures impayées",
      description: `${invoices.length} facture${invoices.length > 1 ? "s" : ""} en attente de paiement, pour un reste total de ${formatCfa(total)}.`,
      href: "/factures",
      label: "Voir les factures",
    });
  }

  // 3. Tickets impayés.
  const tickets = unpaidTickets ?? [];
  if (tickets.length > 0) {
    const total = tickets.reduce((sum, ticket) => sum + (Number(ticket.remaining) || 0), 0);
    alerts.push({
      id: "unpaid-tickets",
      severity: "warning",
      title: "Tickets impayés",
      description: `${tickets.length} ticket${tickets.length > 1 ? "s" : ""} en attente de paiement, pour un reste total de ${formatCfa(total)}.`,
      href: "/tickets",
      label: "Voir les tickets",
    });
  }

  // 4. Ordonnances récentes : simple information d'activité.
  for (const prescription of prescriptions ?? []) {
    alerts.push({
      id: `prescription-${prescription.id}`,
      severity: "info",
      title: `Ordonnance récente — ${prescription.patient_name}`,
      description: `Ordonnance active créée le ${formatDate(prescription.created_at)}.`,
      href: "/ordonnances",
      label: "Voir les ordonnances",
    });
  }

  // 5. Stock : information neutre, aucun suivi de stock n'existe dans l'application.
  alerts.push({
    id: "stock-not-tracked",
    severity: "info",
    title: "Stock non suivi",
    description: `Le catalogue contient ${medicationCount ?? 0} médicament${(medicationCount ?? 0) > 1 ? "s" : ""}. Aucun suivi de stock n'est disponible.`,
    href: "/ordonnances",
    label: "Voir le catalogue",
  });

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Notifications"
        subtitle="Alertes et activité récente de votre structure."
      />
      <NotificationsClient alerts={alerts} />
    </div>
  );
}
