import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import HistoriqueClient from "./historique-client";

export default async function TicketsDuJourPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier" && user.role !== "platform_admin") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("structure_id", user.structureId)
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`)
    .order("created_at", { ascending: false })
    .limit(500);

  const active = (tickets ?? []).filter((t) => t.status === "actif");
  const totals = {
    count: (tickets ?? []).length,
    total: active.reduce((s, t) => s + (t.total ?? 0), 0),
    collected: active.reduce((s, t) => s + (t.advance ?? 0), 0),
    remaining: active.reduce((s, t) => s + (t.remaining ?? 0), 0),
  };

  const dateLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = [
    { label: "Tickets aujourd’hui", value: String(totals.count) },
    { label: "Total facturé", value: `${totals.total.toLocaleString("fr-FR")} F CFA` },
    { label: "Encaissé", value: `${totals.collected.toLocaleString("fr-FR")} F CFA` },
    { label: "Restes", value: `${totals.remaining.toLocaleString("fr-FR")} F CFA` },
  ];

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Tickets du jour"
        subtitle={`Caisse · ${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)}`}
      >
        <Link href="/tickets/historique" className="btn-secondary">
          Historique complet
        </Link>
      </ScreenHeader>

      <div className="card grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-[13px] font-semibold text-muted">{stat.label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <HistoriqueClient tickets={tickets ?? []} />
    </div>
  );
}
