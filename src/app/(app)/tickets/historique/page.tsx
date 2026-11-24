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

      {/* Tabs Tickets / Factures */}
      <div className="flex gap-2">
        <span className="btn-primary" style={{ height: 40, padding: "0 20px", borderRadius: 14, fontSize: 14, width: "auto" }}>
          Tickets
        </span>
        <Link href="/factures" className="btn-secondary" style={{ height: 40, padding: "0 20px", borderRadius: 14, fontSize: 14 }}>
          Factures
        </Link>
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="card grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1.2fr_0.85fr_0.95fr_0.9fr_auto]"
      >
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

        {/* Selects with a chevron set back from the right edge */}
        {[
          {
            name: "year",
            value: sp.year ?? "",
            label: "Toutes années",
            options: [{ value: String(new Date().getFullYear()), label: String(new Date().getFullYear()) }],
          },
          {
            name: "service",
            value: sp.service ?? "",
            label: "Tous services",
            options: (services ?? []).map((s) => ({ value: s.id, label: s.name })),
          },
          {
            name: "status",
            value: sp.status ?? "",
            label: "Tous statuts",
            options: [
              { value: "actif", label: "Valide" },
              { value: "annule", label: "Annulé" },
            ],
          },
        ].map((sel) => (
          <div key={sel.name} className="relative min-w-0">
            <select
              name={sel.name}
              defaultValue={sel.value}
              className="in appearance-none"
              style={{ paddingRight: 42 }}
            >
              <option value="">{sel.label}</option>
              {sel.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute top-1/2 -translate-y-1/2"
              style={{ right: 16 }}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0b7a6b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        ))}

        <button
          type="submit"
          className="btn-primary w-full px-6 sm:w-auto"
          style={{ height: 52, borderRadius: 14 }}
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

