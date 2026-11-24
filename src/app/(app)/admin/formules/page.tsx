import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../../screen-header";
import { createPlan, togglePlanActive } from "@/app/actions/admin";
import { DeletePlanButton } from "../admin-client";

export default async function FormulesPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "platform_admin") redirect("/tableau");

  const supabase = createServiceClient();
  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("*")
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
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div>
                <p className="font-bold text-ink">{p.name}</p>
                <p className="text-xs text-muted">
                  {p.monthly_price.toLocaleString("fr-FR")} F/mois · inscription {p.registration_fee.toLocaleString("fr-FR")} F · {p.duration_days} jours
                </p>
                <p className="text-xs text-muted">
                  {(structures ?? []).filter((s) => s.plan_id === p.id).length} structure(s) abonnée(s)
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
                <DeletePlanButton id={p.id} />
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
    </div>
  );
}
