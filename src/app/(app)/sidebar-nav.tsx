"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

type Role = "platform_admin" | "structure_admin" | "cashier" | "docteur";

function Icon({ name }: { name: "ticket" | "history" | "tag" | "users" | "settings" }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "ticket":
      return (
        <svg {...common}>
          <path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a2.5 2.5 0 0 0 0 5v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2.5 2.5 0 0 0 0-5z" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M20 12l-8 8-8-8V4h8z" />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0M17 11.5a3 3 0 1 0-1.5-5.6M21 20a5 5 0 0 0-4-4.9" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      );
  }
}

type Item = { href: string; label: string; icon: "ticket" | "history" | "tag" | "users" | "settings" };

export default function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const ticketAccess = role === "structure_admin" || role === "cashier" || role === "platform_admin";
  const adminAccess = role === "structure_admin" || role === "platform_admin";

  const items: Item[] = [];
  if (ticketAccess) {
    items.push({ href: "/tickets/nouveau", label: "Tickets", icon: "ticket" });
    items.push({ href: "/tickets", label: "Historique", icon: "history" });
  }
  if (adminAccess) {
    items.push({ href: "/tarifs", label: "Tarifs", icon: "tag" });
    items.push({ href: "/utilisateurs", label: "Utilisateurs", icon: "users" });
    items.push({ href: "/reglages", label: "Réglages", icon: "settings" });
  }

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/tickets") {
      return pathname.startsWith("/tickets/") && pathname !== "/tickets/nouveau";
    }
    return false;
  };

  return (
    <aside className="print:hidden sticky top-0 flex h-screen w-[104px] shrink-0 flex-col items-center gap-2.5 overflow-y-auto bg-ink py-7">
      <Link
        href="/tableau"
        aria-label="Tableau de bord"
        className="mb-[22px] flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>

      <nav className="flex flex-col items-center gap-2.5">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`nv ${isActive(item.href) ? "on" : ""}`}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>

      <form action={logout} className="mt-auto pt-4">
        <button type="submit" className="nv" style={{ width: 92, fontSize: 12 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
            <path d="M10 8l-4 4 4 4M6 12h9" />
          </svg>
          Déconnexion
        </button>
      </form>
    </aside>
  );
}
