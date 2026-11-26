import Link from "next/link";
import { connection } from "next/server";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  signup: "Création de compte",
  login: "Connexion",
  login_failed: "Échec de connexion",
  logout: "Déconnexion",
  password_reset_requested: "Demande de réinitialisation",
  password_changed: "Mot de passe modifié",
  profile_updated: "Profil modifié",
  user_created: "Utilisateur créé",
  user_updated: "Utilisateur modifié",
  user_password_reset: "Mot de passe utilisateur réinitialisé",
  user_activated: "Utilisateur activé",
  user_deactivated: "Utilisateur désactivé",
  ticket_restore: "Ticket restauré",
  care_created: "Soin créé",
  care_updated: "Soin modifié",
  care_activated: "Soin activé",
  care_deactivated: "Soin désactivé",
  care_deleted: "Soin supprimé",
  service_created: "Tarif créé",
  service_updated: "Tarif modifié",
  service_activated: "Tarif activé",
  service_deactivated: "Tarif désactivé",
  service_deleted: "Tarif supprimé",
  settings_updated: "Réglages modifiés",
  print_format_updated: "Format d'impression modifié",
  renewal_payment_declared: "Paiement de renouvellement déclaré",
  structure_activated: "Structure activée",
  structure_deactivated: "Structure désactivée",
  structure_suspended: "Structure suspendue",
  structure_unsuspended: "Structure réactivée",
  subscription_updated: "Abonnement mis à jour",
  registration_fee_validated: "Frais d'inscription validés",
  registration_fee_invalidated: "Frais d'inscription invalidés",
  registration_validated: "Inscription validée",
  registration_rejected: "Inscription rejetée",
  plan_created: "Formule créée",
  plan_updated: "Formule modifiée",
  plan_deleted: "Formule supprimée",
  plan_activated: "Formule activée",
  plan_deactivated: "Formule désactivée",
  ticket_create: "Ticket créé",
  ticket_set_total: "Total du ticket modifié",
  ticket_cancel: "Ticket annulé",
  ticket_print: "Ticket imprimé",
  invoice_create: "Facture créée",
  invoice_cancel: "Facture annulée",
  invoice_print: "Facture imprimée",
};

function label(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

function formatDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "—";
  const entries = Object.entries(details as Record<string, unknown>).filter(
    ([key]) => !/password|secret|token|authorization|cookie|api_key/i.test(key),
  );
  if (!entries.length) return "—";
  return entries
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}

/** The e-mail lives in auth.users, but audit details often carry it. */
function detailEmail(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const value = (details as Record<string, unknown>).email;
  return typeof value === "string" && value.includes("@") ? value : null;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; action?: string; structure?: string }>;
}) {
  await connection();
  const user = await requireRole("structure_admin", "platform_admin");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createServiceClient();
  let query = supabase
    .from("audit_log")
    .select("id, action, details, created_at, structure_id, user_id, ticket_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (user.role !== "platform_admin") {
    if (!user.structureId) return <p className="p-6">Aucune structure associée.</p>;
    query = query.eq("structure_id", user.structureId);
  }
  if (params.q?.trim()) {
    query = query.ilike("action", `%${params.q.trim()}%`);
  }
  if (params.action?.trim()) {
    query = query.eq("action", params.action.trim());
  }
  if (params.structure?.trim() && user.role === "platform_admin") {
    query = query.eq("structure_id", params.structure.trim());
  }

  const { data: allStructures } = user.role === "platform_admin"
    ? await supabase.from("structures").select("id, name").order("name")
    : { data: [] as { id: string; name: string }[] };

  const { data: logs, count } = await query;

  const userIds = [...new Set((logs ?? []).map((l) => l.user_id).filter(Boolean))] as string[];
  const structureIds = [
    ...new Set((logs ?? []).map((l) => l.structure_id).filter(Boolean)),
  ] as string[];
  const [{ data: profiles, error: profilesError }, { data: structures }] = await Promise.all([
    userIds.length
      // profiles has no email column: the address lives in auth.users and,
      // for auth actions, in audit_log.details.email.
      ? supabase.from("profiles").select("id, full_name, role").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    user.role === "platform_admin" && structureIds.length
      ? supabase.from("structures").select("id, name").in("id", structureIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesError) {
    console.error("[journal] profiles:", profilesError.message);
  }
  const users = new Map((profiles ?? []).map((p) => [p.id, p]));
  const names = new Map((structures ?? []).map((s) => [s.id, s.name]));

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) =>
    `/journal?page=${p}&q=${encodeURIComponent(params.q ?? "")}&action=${encodeURIComponent(params.action ?? "")}&structure=${encodeURIComponent(params.structure ?? "")}`;

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Journal d'activité"
        subtitle="Trace des connexions et des actions effectuées par les utilisateurs."
      >
        {user.role === "platform_admin" && (
          <Link href="/api/admin/export?type=journal" className="btn-secondary" style={{ height: 40, padding: "0 14px", borderRadius: 12, fontSize: 13, width: "auto" }}>Exporter CSV</Link>
        )}
      </ScreenHeader>

      <form method="get" className="card flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="lbl" htmlFor="q">Rechercher une action</label>
          <input id="q" name="q" defaultValue={params.q ?? ""} className="input" placeholder="ex. login, ticket, user" />
        </div>
        <div>
          <label className="lbl" htmlFor="action">Action</label>
          <select id="action" name="action" className="input" defaultValue={params.action ?? ""} style={{ width: 200 }}>
            <option value="">Toutes</option>
            {Object.keys(ACTION_LABELS).map((a) => <option key={a} value={a}>{label(a)}</option>)}
          </select>
        </div>
        {user.role === "platform_admin" && (
          <div>
            <label className="lbl" htmlFor="structure">Structure</label>
            <select id="structure" name="structure" className="input" defaultValue={params.structure ?? ""} style={{ width: 200 }}>
              <option value="">Toutes</option>
              {(allStructures ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <button type="submit" className="btn-primary" style={{ height: 40, padding: "0 16px" }}>Filtrer</button>
        <Link href="/journal" className="btn-secondary" style={{ height: 40, padding: "0 16px" }}>Réinitialiser</Link>
      </form>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr className="border-b border-border">
              <th className="py-3 pr-3">Date et heure</th>
              <th className="py-3 pr-3">Utilisateur</th>
              <th className="py-3 pr-3">Action</th>
              <th className="py-3 pr-3">Détails</th>
              {user.role === "platform_admin" && <th className="py-3 pr-3">Structure</th>}
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => {
              const profile = users.get(log.user_id ?? "");
              return (
                <tr key={log.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-3 whitespace-nowrap text-xs text-muted">
                    {new Date(log.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="py-3 pr-3">
                    <span className="font-semibold">
                      {profile?.full_name ||
                        detailEmail(log.details) ||
                        (log.user_id ? (profile ? "Utilisateur" : "Compte supprimé") : "—")}
                    </span>
                    {profile?.role && <span className="block text-[11px] text-muted">{profile.role}</span>}
                  </td>
                  <td className="py-3 pr-3 font-semibold text-ink">{label(log.action)}</td>
                  <td className="py-3 pr-3 break-all text-xs text-muted">{formatDetails(log.details)}</td>
                  {user.role === "platform_admin" && (
                    <td className="py-3 pr-3 text-xs">{log.structure_id ? names.get(log.structure_id) ?? log.structure_id : "—"}</td>
                  )}
                </tr>
              );
            })}
            {!logs?.length && (
              <tr><td colSpan={user.role === "platform_admin" ? 5 : 4} className="py-8 text-center text-muted">Aucune activité enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>{total} entrée(s) — page {page}/{pages}</span>
        <div className="flex gap-2">
          {page > 1 && <Link href={href(page - 1)} className="btn-secondary" style={{ height: 36, padding: "0 12px" }}>← Précédent</Link>}
          {page < pages && <Link href={href(page + 1)} className="btn-secondary" style={{ height: 36, padding: "0 12px" }}>Suivant →</Link>}
        </div>
      </div>
    </div>
  );
}
