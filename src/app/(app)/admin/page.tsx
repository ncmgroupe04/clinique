import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import { toggleStructureActive, updateSubscription, toggleSuspended } from "@/app/actions/admin";

const PLAN_LABEL: Record<string, string> = {
  essai: "Essai",
  mensuel: "Mensuel",
  annuel: "Annuel",
};

export default async function AdminPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "platform_admin") redirect("/tableau");

  const supabase = createServiceClient();
  const { data: structures } = await supabase
    .from("structures")
    .select("id, name, active, created_at, plan, subscription_ends_at, suspended")
    .order("created_at", { ascending: false });

  const { data: counts } = await supabase.from("tickets").select("structure_id");
  const countMap = new Map<string, number>();
  for (const t of counts ?? []) {
    countMap.set(t.structure_id, (countMap.get(t.structure_id) ?? 0) + 1);
  }

  const now = new Date();

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Super Admin · Abonnements"
        subtitle="Gestion des structures et de leurs formules d'abonnement."
      />
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Structures abonnées</h2>
          <span className="text-sm font-semibold text-muted">
            {structures?.length ?? 0} structure(s)
          </span>
        </div>
        {(!structures || structures.length === 0) ? (
          <p className="text-sm text-muted">Aucune structure.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Structure</th>
                  <th className="py-2 pr-3">Formule</th>
                  <th className="py-2 pr-3">Échéance</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Tickets</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {structures.map((s) => {
                  const endsAt = s.subscription_ends_at ? new Date(s.subscription_ends_at) : null;
                  const expired = endsAt ? endsAt < now : false;
                  const status = !s.active
                    ? "Désactivée"
                    : s.suspended
                      ? "Suspendue"
                      : expired
                        ? "Expirée"
                        : "Active";
                  const statusColor = !s.active || s.suspended || expired ? "text-danger" : "text-accent";
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-3 font-bold text-ink">{s.name}</td>
                      <td className="py-3 pr-3">{PLAN_LABEL[s.plan] ?? s.plan}</td>
                      <td className="py-3 pr-3">
                        {endsAt ? endsAt.toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className={`py-3 pr-3 font-semibold ${statusColor}`}>{status}</td>
                      <td className="py-3 pr-3">{countMap.get(s.id) ?? 0}</td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={toggleSuspended} className="inline">
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="suspended" value={String(s.suspended)} />
                            <button
                              type="submit"
                              className="btn-secondary"
                              style={{ height: 32, padding: "0 12px", borderRadius: 10, fontSize: 12 }}
                            >
                              {s.suspended ? "Réactiver" : "Suspendre"}
                            </button>
                          </form>
                          <form action={updateSubscription} className="flex items-center gap-2">
                            <input type="hidden" name="id" value={s.id} />
                            <select
                              name="plan"
                              defaultValue={s.plan}
                              className="input"
                              style={{ height: 32, width: 110, fontSize: 12 }}
                            >
                              <option value="essai">Essai</option>
                              <option value="mensuel">Mensuel</option>
                              <option value="annuel">Annuel</option>
                            </select>
                            <input
                              name="days"
                              type="number"
                              min={1}
                              defaultValue={30}
                              className="input"
                              style={{ height: 32, width: 70, fontSize: 12 }}
                            />
                            <button
                              type="submit"
                              className="go"
                              style={{ height: 32, padding: "0 12px", borderRadius: 10, fontSize: 12, width: "auto" }}
                            >
                              Prolonger
                            </button>
                          </form>
                          <form action={toggleStructureActive} className="inline">
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="active" value={String(s.active)} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-muted underline-offset-2 hover:underline"
                            >
                              {s.active ? "Désactiver la structure" : "Réactiver la structure"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
