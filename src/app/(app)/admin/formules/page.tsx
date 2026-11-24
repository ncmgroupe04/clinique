import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../../screen-header";
import { createPlan, togglePlanActive } from "@/app/actions/admin";
import { DeletePlanButton, EditPlanButton } from "../admin-client";
import { PLAN_FEATURES } from "@/lib/plan-features";

export default async function FormulesPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "platform_admin") redirect("/tableau");

  const supabase = createServiceClient();
  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("id, name, monthly_price, registration_fee, duration_days, max_cashiers, max_docteurs, is_unlimited, is_public, active, max_documents_per_month, features")
    .order("created_at", { ascending: true });
  const { data: structures } = await supabase.from("structures").select("plan_id");

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Formules d'abonnement"
        subtitle="Créez et gérez les formules proposées aux structures."
      />
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Formules</h2>
          <span className="text-sm font-semibold text-muted">{plans?.length ?? 0} formule(s)</span>
        </div>
        <ul className="divide-y divide-border">
          {(plans ?? []).map((p) => (
            <li key={p.id} className="space-y-3 py-6">
              <div>
                <p className="font-bold text-ink">{p.name}</p>
                <p className="text-xs text-muted">
                  {p.monthly_price.toLocaleString("fr-FR")} F/mois · {p.duration_days} jours
                  {p.is_unlimited ? " · utilisateurs illimités" : ` · ${p.max_cashiers ?? 0} caissier(s), ${p.max_docteurs ?? 0} docteur(s)`}
                  {p.max_documents_per_month ? ` · ${p.max_documents_per_month} documents/mois` : " · documents illimités"}
                  {!p.is_public && " · privée (vous seul)"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(p.features ?? []).map((f: string) => (
                    <span key={f} className="rounded-full bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent-text">
                      {PLAN_FEATURES.find((x) => x.value === f)?.label ?? f}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">
                  {(structures ?? []).filter((s) => s.plan_id === p.id).length} structure(s) abonnée(s)
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
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
                <EditPlanButton
                  plan={{
                    id: p.id,
                    name: p.name,
                    monthly_price: p.monthly_price,
                    duration_days: p.duration_days,
                    max_cashiers: p.max_cashiers,
                    max_docteurs: p.max_docteurs,
                    is_unlimited: p.is_unlimited,
                    is_public: p.is_public,
                    max_documents_per_month: p.max_documents_per_month,
                    features: p.features ?? [],
                  }}
                />
                <DeletePlanButton id={p.id} />
              </div>
            </li>
          ))}
        </ul>
        <form action={createPlan} className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-3">
          <input name="name" placeholder="Nom de la formule" required className="input" style={{ height: 38, fontSize: 14 }} />
          <input name="monthly_price" type="number" min={0} placeholder="Prix mensuel (F)" required className="input" style={{ height: 38, fontSize: 14 }} />
          <input name="duration_days" type="number" min={1} defaultValue={30} placeholder="Durée (jours)" required className="input" style={{ height: 38, fontSize: 14 }} />
          <div className="md:col-span-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_unlimited" value="true" className="accent-accent" /> Utilisateurs illimités</label>
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_public" value="true" defaultChecked className="accent-accent" /> Visible à l&apos;inscription</label>
            <input name="max_cashiers" type="number" min={0} placeholder="Nb caissiers" className="input" style={{ height: 34, fontSize: 13 }} />
            <input name="max_docteurs" type="number" min={0} placeholder="Nb docteurs" className="input" style={{ height: 34, fontSize: 13 }} />
            <input name="max_documents_per_month" type="number" min={1} placeholder="Documents / mois (vide = illimité)" className="input" style={{ height: 34, fontSize: 13 }} />
          </div>
          <div className="md:col-span-3">
            <p className="lbl">Fonctionnalités incluses</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {PLAN_FEATURES.map((f) => (
                <label key={f.value} className="flex items-center gap-1.5 text-xs text-ink">
                  <input type="checkbox" name="features" value={f.value} className="accent-accent" defaultChecked={["tickets", "factures", "soins", "historique", "reglages", "abonnement"].includes(f.value)} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button type="submit" className="go" style={{ height: 38, padding: "0 16px", borderRadius: 10, fontSize: 13, width: "auto" }}>
              + Ajouter une formule
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
