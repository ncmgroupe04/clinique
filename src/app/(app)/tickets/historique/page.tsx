import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../../screen-header";
import HistoriqueClient from "../historique-client";

type SearchParams = {
  q?: string;
  year?: string;
  date?: string;
  service?: string;
  status?: string;
};

export default async function HistoriquePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier" && user.role !== "platform_admin") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const sp = await searchParams;
  const supabase = await createClient();

  // Services for filter dropdown
  const { data: services } = await supabase
    .from("services")
    .select("id, name")
    .eq("structure_id", user.structureId)
    .order("name", { ascending: true });

  // Build ticket query
  let query = supabase
    .from("tickets")
    .select("*")
    .eq("structure_id", user.structureId);

  if (sp.status && (sp.status === "actif" || sp.status === "annule")) {
    query = query.eq("status", sp.status);
  }
  if (sp.year) {
    query = query.eq("year", Number(sp.year));
  }
  if (sp.date) {
    // date as YYYY-MM-DD
    query = query.gte("created_at", `${sp.date}T00:00:00`).lte("created_at", `${sp.date}T23:59:59`);
  }
  if (sp.service) {
    query = query.eq("service_id", sp.service);
  }
  if (sp.q) {
    query = query.or(`patient_name.ilike.%${sp.q}%,number.eq.${Number(sp.q) || 0}`);
  }

  const { data: tickets } = await query.order("created_at", { ascending: false }).limit(200);

  // Daily totals (today, all active)
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayTickets } = await supabase
    .from("tickets")
    .select("total, advance, remaining, status")
    .eq("structure_id", user.structureId)
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  const totals = {
    count: todayTickets?.length ?? 0,
    collected: (todayTickets ?? [])
      .filter((t) => t.status === "actif")
      .reduce((s, t) => s + (t.advance ?? 0), 0),
    remaining: (todayTickets ?? [])
      .filter((t) => t.status === "actif")
      .reduce((s, t) => s + (t.remaining ?? 0), 0),
  };

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Historique"
        subtitle="Recherche et filtres par nom, numéro, date, service et statut."
      >
        <Link href="/tickets" className="btn-secondary">
          Tickets du jour
        </Link>
      </ScreenHeader>

      {/* Filters */}
      <form method="GET" className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Recherche (nom ou n°)"
          className="input"
        />
        <input
          name="date"
          type="date"
          defaultValue={sp.date ?? ""}
          className="input"
        />
        <select
          name="year"
          defaultValue={sp.year ?? ""}
          className="input"
        >
          <option value="">Toutes années</option>
          <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
        </select>
        <select
          name="service"
          defaultValue={sp.service ?? ""}
          className="input"
        >
          <option value="">Tous services</option>
          {(services ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="input"
        >
          <option value="">Tous statuts</option>
          <option value="actif">Valide</option>
          <option value="annule">Annulé</option>
        </select>
        <button
          type="submit"
          className="btn-primary w-full px-8 sm:w-auto sm:justify-self-start lg:col-span-5"
        >
          Filtrer
        </button>
      </form>

      {/* Daily totals */}
      <div className="card grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-[#4B5F6B]">Tickets aujourd&apos;hui</p>
          <p className="text-lg font-semibold text-[#0B1F2A]">{totals.count}</p>
        </div>
        <div>
          <p className="text-xs text-[#4B5F6B]">Encaissé</p>
          <p className="text-lg font-semibold text-[#0B1F2A]">
            {totals.collected.toLocaleString("fr-FR")} F CFA
          </p>
        </div>
        <div>
          <p className="text-xs text-[#4B5F6B]">Restes</p>
          <p className="text-lg font-semibold text-[#0B1F2A]">
            {totals.remaining.toLocaleString("fr-FR")} F CFA
          </p>
        </div>
      </div>

      <HistoriqueClient tickets={tickets ?? []} />
    </div>
  );
}

