import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import BarChart, { type ChartDatum } from "./chart";

export default async function AdminPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "platform_admin") redirect("/tableau");

  const supabase = createServiceClient();
  const { data: structures } = await supabase
    .from("structures")
    .select("id, name, active, created_at, plan, subscription_ends_at, suspended, registration_fee_paid, plan_id")
    .order("created_at", { ascending: false });

  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("created_at", { ascending: true });

  const now = new Date();
  const planMap = new Map((plans ?? []).map((p) => [p.id, p]));

  // KPIs
  const activeSubs = (structures ?? []).filter(
    (s) => s.active && !s.suspended && s.subscription_ends_at && new Date(s.subscription_ends_at) >= now,
  );
  const mrr = activeSubs.reduce((sum, s) => {
    const p = s.plan_id ? planMap.get(s.plan_id) : null;
    return sum + (p?.monthly_price ?? 25000);
  }, 0);
  const arr = mrr * 12;
  const daily = Math.round(mrr / 30);
  const weekly = Math.round(mrr / 4.33);
  const monthly = mrr;

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Tableau de bord · Super Admin"
        subtitle="Abonnés, MRR/ARR, prévisions et formules — formule unique : 25 000 F CFA / mois."
      />

      {/* KPIs */}
      <div className="card grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[
          { label: "Abonnés actifs", value: String(activeSubs.length) },
          { label: "MRR (mensuel)", value: `${mrr.toLocaleString("fr-FR")} F` },
          { label: "ARR (annuel)", value: `${arr.toLocaleString("fr-FR")} F` },
        ].map((k) => (
          <div key={k.label} className="text-center">
            <p className="text-[13px] font-semibold text-muted">{k.label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="card grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Prévision / jour", value: `${daily.toLocaleString("fr-FR")} F` },
          { label: "Prévision / semaine", value: `${weekly.toLocaleString("fr-FR")} F` },
          { label: "Prévision / mois", value: `${monthly.toLocaleString("fr-FR")} F` },
          { label: "Prévision / an", value: `${arr.toLocaleString("fr-FR")} F` },
        ].map((k) => (
          <div key={k.label} className="text-center">
            <p className="text-[13px] font-semibold text-muted">{k.label}</p>
            <p className="mt-1 text-xl font-extrabold text-accent">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <BarChart
          title="Répartition des structures"
          data={[
            { label: "Actives", value: activeSubs.length, color: "#0b7a6b" },
            { label: "Suspendues", value: (structures ?? []).filter((s) => s.suspended).length, color: "#f59e0b" },
            { label: "Expirées", value: (structures ?? []).filter((s) => s.subscription_ends_at && new Date(s.subscription_ends_at) < now).length, color: "#dc2626" },
            { label: "Désactivées", value: (structures ?? []).filter((s) => !s.active).length, color: "#6b7280" },
          ] as ChartDatum[]}
        />
        <BarChart
          title="Formules utilisées"
          data={(plans ?? []).map((p, i) => ({
            label: p.name,
            value: (structures ?? []).filter((s) => s.plan_id === p.id).length,
            color: ["#0b7a6b", "#1d4e89", "#6b4a00", "#8c2f3d", "#4b3b7a"][i % 5],
          })) as ChartDatum[]}
        />
      </div>

    </div>
  );
}
