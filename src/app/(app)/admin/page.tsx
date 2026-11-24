import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import {
  createPlan,
  togglePlanActive,
  deletePlan,
} from "@/app/actions/admin";
import AdminStructuresTable from "./admin-client";

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

  const { data: counts } = await supabase.from("tickets").select("structure_id");
  const countMap = new Map<string, number>();
  for (const t of counts ?? []) {
    countMap.set(t.structure_id, (countMap.get(t.structure_id) ?? 0) + 1);
  }

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
  const regFees = (structures ?? []).filter((s) => s.registration_fee_paid).length * 50000;

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Super Admin · Abonnements"
        subtitle="Formule unique : 25 000 F CFA / mois + frais d'inscription 50 000 F CFA."
      />

      {/* KPIs */}
      <div className="card grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Abonnés actifs", value: String(activeSubs.length) },
          { label: "MRR (mensuel)", value: `${mrr.toLocaleString("fr-FR")} F` },
          { label: "ARR (annuel)", value: `${arr.toLocaleString("fr-FR")} F` },
          { label: "Inscriptions payées", value: `${regFees.toLocaleString("fr-FR")} F` },
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

      {/* Plans management */}
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Formules d&apos;abonnement</h2>
          <span className="text-sm font-semibold text-muted">{plans?.length ?? 0} formule(s)</span>
        </div>
        <ul className="divide-y divide-border">
          {(plans ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div>
                <p className="font-bold text-ink">{p.name}</p>
                <p className="text-xs text-muted">
                  {p.monthly_price.toLocaleString("fr-FR")} F/mois · inscription {p.registration_fee.toLocaleString("fr-FR")} F · {p.duration_days} jours
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={togglePlanActive}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="active" value={String(p.active)} />
                  <button
                    type="submit"
                    className={p.active ? "btn-secondary" : "btn-danger-solid"}
                    style={{ height: 34, padding: "0 12px", borderRadius: 10, fontSize: 12, width: "auto" }}
                  >
                    {p.active ? "Active" : "Inactive"}
                  </button>
                </form>
                <form action={deletePlan}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="btn-danger-solid"
                    style={{ height: 34, padding: "0 12px", borderRadius: 10, fontSize: 12, width: "auto" }}
                    onClick={(e) => { if (!confirm("Supprimer cette formule ?")) e.preventDefault(); }}
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <form action={createPlan} className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-4">
          <input name="name" placeholder="Nom de la formule" required className="input" style={{ height: 38, fontSize: 14 }} />
          <input name="monthly_price" type="number" min={0} placeholder="Prix mensuel (F)" required className="input" style={{ height: 38, fontSize: 14 }} />
          <input name="registration_fee" type="number" min={0} placeholder="Frais inscription (F)" required className="input" style={{ height: 38, fontSize: 14 }} />
          <input name="duration_days" type="number" min={1} defaultValue={30} placeholder="Durée (jours)" required className="input" style={{ height: 38, fontSize: 14 }} />
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" className="go" style={{ height: 38, padding: "0 16px", borderRadius: 10, fontSize: 13, width: "auto" }}>
              + Ajouter une formule
            </button>
          </div>
        </form>
      </section>

      {/* Structures table with search & filters */}
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Structures abonnées</h2>
        </div>
        <AdminStructuresTable
          structures={(structures ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            active: s.active,
            created_at: s.created_at,
            plan: s.plan,
            subscription_ends_at: s.subscription_ends_at,
            suspended: s.suspended,
            registration_fee_paid: s.registration_fee_paid,
          }))}
          countMap={Object.fromEntries(countMap)}
        />
      </section>
    </div>
  );
}
