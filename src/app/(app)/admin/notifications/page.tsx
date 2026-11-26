import { connection } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/platform";
import ScreenHeader from "../../screen-header";

export default async function NotificationsPage() {
  await connection();
  const user = await requireRole("platform_admin", "structure_admin", "cashier", "docteur");
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, type, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Notifications" subtitle="Alertes et informations de la plateforme.">
        <form action={markAllNotificationsRead}>
          <button type="submit" className="btn-secondary" style={{ height: 42, padding: "0 16px", borderRadius: 12, fontSize: 13, width: "auto" }}>Tout marquer comme lu</button>
        </form>
      </ScreenHeader>

      <section className="card space-y-2">
        {!notifications?.length && <p className="text-sm text-muted">Aucune notification.</p>}
        {(notifications ?? []).map((n) => (
          <div key={n.id} className={`flex items-start justify-between gap-3 rounded-xl p-3 ${n.read ? "bg-white" : "bg-accent-light"}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`cd ${n.read ? "off" : ""}`} style={{ width: 70 }}>
                  {n.type === "warning" ? "Alerte" : n.type === "success" ? "OK" : "Info"}
                </span>
                <span className="font-bold text-ink">{n.title}</span>
              </div>
              {n.body && <p className="mt-1 text-sm text-muted">{n.body}</p>}
              <p className="mt-1 text-[11px] text-muted">{new Date(n.created_at).toLocaleString("fr-FR")}</p>
            </div>
            {!n.read && (
              <form action={markNotificationRead}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" className="text-xs font-semibold text-accent hover:underline">Marquer lu</button>
              </form>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
