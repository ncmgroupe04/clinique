import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { toggleStructureActive } from "@/app/actions/admin";
import ScreenHeader from "../screen-header";

export default async function AdminPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "platform_admin") redirect("/tableau");

  const supabase = createServiceClient();
  const { data: structures } = await supabase
    .from("structures")
    .select("id, name, active, created_at")
    .order("created_at", { ascending: false });

  // ticket counts per structure
  const { data: counts } = await supabase
    .from("tickets")
    .select("structure_id");

  const countMap = new Map<string, number>();
  for (const t of counts ?? []) {
    countMap.set(t.structure_id, (countMap.get(t.structure_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Super Admin · Structures"
        subtitle="Liste des structures inscrites sur la plateforme."
      />
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Structures</h2>
          <span className="text-sm font-semibold text-muted">
            {structures?.length ?? 0} structure(s)
          </span>
        </div>
        {(!structures || structures.length === 0) ? (
          <p className="text-sm text-muted">Aucune structure.</p>
        ) : (
          <ul className="divide-y divide-border">
            {structures.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{s.name}</p>
                  <p className="text-xs text-muted">
                    Inscrite le {new Date(s.created_at).toLocaleDateString("fr-FR")} ·{" "}
                    {countMap.get(s.id) ?? 0} ticket(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`cd ${s.active ? "" : "off"}`}
                    style={{ width: 70 }}
                  >
                    {s.active ? "Active" : "Inactive"}
                  </span>
                  <form action={toggleStructureActive}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={String(s.active)} />
                    <button
                      type="submit"
                      className={s.active ? "btn-danger-solid" : "btn-secondary"}
                      style={{ height: 40, padding: "0 16px", borderRadius: 12, fontSize: 13 }}
                    >
                      {s.active ? "Désactiver" : "Réactiver"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
