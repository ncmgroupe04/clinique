import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const user = await requireUser();
  const showTicketLinks =
    user.role === "structure_admin" ||
    user.role === "cashier" ||
    user.role === "platform_admin";
  const showAdminLinks =
    user.role === "structure_admin" || user.role === "platform_admin";
  const navLink =
    "text-sm font-semibold text-[#0B1F2A] hover:text-[#0B5F54] px-3 py-2 rounded-[14px] whitespace-nowrap";
  return (
    <div className="min-h-screen bg-[#EEF3F6]">
      <header className="print:hidden sticky top-0 z-20 bg-white border-b border-[#E2EAEF] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Link
            href="/tableau"
            className="font-bold text-[#0B7A6B] text-lg whitespace-nowrap"
          >
            Tickets
          </Link>
          <nav className="flex-1 flex items-center gap-1 overflow-x-auto no-print">
            <Link href="/tableau" className={navLink}>
              Tableau
            </Link>
            {showTicketLinks && (
              <>
                <Link href="/tickets/nouveau" className={navLink}>
                  Nouveau ticket
                </Link>
                <Link href="/tickets" className={navLink}>
                  Historique
                </Link>
              </>
            )}
            {showAdminLinks && (
              <>
                <Link href="/tarifs" className={navLink}>
                  Tarifs
                </Link>
                <Link href="/utilisateurs" className={navLink}>
                  Utilisateurs
                </Link>
                <Link href="/reglages" className={navLink}>
                  Réglages
                </Link>
              </>
            )}
          </nav>
          <form action={logout} className="no-print shrink-0">
            <button
              type="submit"
              className="text-sm font-semibold text-[#0B7A6B] px-3 py-2 rounded-[14px] hover:bg-[#F0F7F5] whitespace-nowrap"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <main className="px-4 py-6 max-w-3xl mx-auto">{children}</main>
    </div>
  );
}
