import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import SidebarNav from "./sidebar-nav";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./logout-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const user = await requireUser();

  let renewalAlert: string | null = null;
  let unreadNotifications = 0;
  if (user.role === "platform_admin") {
    const notifClient = await createClient();
    const { count } = await notifClient
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    unreadNotifications = count ?? 0;
  }
  if (user.structureId) {
    const supabase = createServiceClient();
    const { data: structure } = await supabase
      .from("structures")
      .select("active, suspended, subscription_ends_at")
      .eq("id", user.structureId)
      .maybeSingle();
    const now = new Date();
    const expired = structure?.subscription_ends_at
      ? new Date(structure.subscription_ends_at) < now
      : false;
    if (!structure || !structure.active || structure.suspended || expired) {
      redirect("/suspendu");
    }
    if (structure?.subscription_ends_at && (user.role === "cashier" || user.role === "docteur")) {
      const days = Math.ceil(
        (new Date(structure.subscription_ends_at).getTime() - now.getTime()) / 86_400_000,
      );
      if (days <= 7) renewalAlert = days <= 0 ? "expired" : String(days);
    }
  }

  return (
    <div className="flex min-h-screen bg-bg print:min-h-0 print:bg-white">
      <SidebarNav role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print:hidden flex items-center justify-end gap-3 px-6 py-3 lg:px-10 lg:py-4">
          {user.role === "platform_admin" && (
            <Link
              href="/admin/notifications"
              aria-label="Notifications"
              className="btn-secondary"
              style={{ height: 48, padding: "0 14px", borderRadius: 14, fontSize: 13, width: "auto" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {unreadNotifications > 0 && (
                <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">{unreadNotifications}</span>
              )}
            </Link>
          )}
          <Link
            href="/profil"
            className="btn-secondary"
            style={{ height: 48, padding: "0 16px", borderRadius: 14, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
            <span className="max-w-[160px] truncate">{user.fullName || "Profil"}</span>
          </Link>
          <LogoutButton />
        </header>
        <main className="flex min-w-0 flex-1 flex-col px-6 pb-6 lg:px-10 lg:pb-9 print:p-0">
          {renewalAlert && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
              <span className="text-lg">⚠</span>
              <span>
                {renewalAlert === "expired"
                  ? "L'abonnement de la structure est expiré. Prévenez l'administrateur pour le renouveler."
                  : `L'abonnement expire dans ${renewalAlert} jour(s). Prévenez l'administrateur pour le renouveler.`}
              </span>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
