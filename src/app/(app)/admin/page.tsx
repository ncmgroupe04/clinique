import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import {
  toggleStructureActive,
  updateSubscription,
  toggleSuspended,
  toggleRegistrationFee,
} from "@/app/actions/admin";

export default async function AdminPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "platform_admin") redirect("/tableau");

  const supabase = createServiceClient();
  const { data: structures } = await supabase
    .from("structures")
    .select("id, name, active, created_at, plan, subscription_ends_at, suspended, registration_fee_paid")
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
        subtitle="Formule unique : 25 000 F CFA / mois + frais d'inscription 50 000 F CFA."
      />
      {(() => {
        const total = structures?.length ?? 0;
        const active = structures?.filter((s) => s.active && !s.suspended && (s.subscription_ends_at ? new Date(s.subscription_ends_at) >= now : true)).length ?? 0;
        const suspended = structures?.filter((s) => s.suspended).length ?? 0;
        const expired = structures?.filter((s) => s.subscription_ends_at && new Date(s.subscription_ends_at) < now).length ?? 0;
        const paidReg = structures?.filter((s) => s.registration_fee_paid).length ?? 0;
        return (
          <div className="card grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              { label: "Structures", value: String(total) },
              { label: "Actives", value: String(active) },
              { label: "Suspendues", value: String(suspended) },
              { label: "Expirées", value: String(expired) },
              { label: "Inscriptions payées", value: String(paidReg) },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-[13px] font-semibold text-muted">{s.label}</p>
                <p className="mt-1 text-xl font-extrabold text-ink">{s.value}</p>
              </div>
            ))}
          </div>
        );
      })()}
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
                  <th className="py-2 pr-3">Inscription (50 000 F)</th>
                  <th className="py-2 pr-3">Échéance mensuelle</th>
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
                      <td className="py-3 pr-3">
                        <form action={toggleRegistrationFee} className="inline">
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="paid" value={String(s.registration_fee_paid)} />
                          <button
                            type="submit"
                            className={s.registration_fee_paid ? "text-accent font-semibold" : "text-danger font-semibold"}
                          >
                            {s.registration_fee_paid ? "Payée" : "Non payée"}
                          </button>
                        </form>
                      </td>
                      <td className="py-3 pr-3">
                        {endsAt ? endsAt.toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className={`py-3 pr-3 font-semibold ${statusColor}`}>{status}</td>
                      <td className="py-3 pr-3">{countMap.get(s.id) ?? 0}</td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={updateSubscription} className="inline">
                            <input type="hidden" name="id" value={s.id} />
                            <button
                              type="submit"
                              className="go"
                              style={{ height: 32, padding: "0 12px", borderRadius: 10, fontSize: 12, width: "auto" }}
                            >
                              + 30 jours
                            </button>
                          </form>
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
                          <form action={toggleStructureActive} className="inline">
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="active" value={String(s.active)} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-muted underline-offset-2 hover:underline"
                            >
                              {s.active ? "Désactiver" : "Réactiver structure"}
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
