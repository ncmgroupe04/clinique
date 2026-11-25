"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Role = "platform_admin" | "structure_admin" | "cashier" | "docteur";

type IconName = "ticket" | "history" | "tag" | "users" | "settings" | "admin" | "care" | "invoice" | "dashboard" | "ordonnance" | "subscription" | "journal" | "wallet";

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 20,
    height: 20,
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
    case "admin":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "care":
      return (
        <svg {...common}>
          <path d="M12 3v18M3 12h18" />
        </svg>
      );
    case "invoice":
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M9 11h7M9 15h7M9 19h4" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case "ordonnance":
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M12 9v6M9 12h6" />
        </svg>
      );
    case "subscription":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "journal":
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M9 12h6M9 16h6M9 8h3" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M16 12h.01M3 9h17" />
        </svg>
      );
  }
}

type Item = { href: string; label: string; icon: IconName };

type Group = {
  key: string;
  label: string;
  icon: IconName;
  items: Item[];
};

export default function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const ticketAccess = role === "structure_admin" || role === "cashier" || role === "platform_admin";
  const adminAccess = role === "structure_admin" || role === "platform_admin";

  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenGroup(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const groups: Group[] = [];

  if (role === "platform_admin") {
    groups.push({
      key: "admin",
      label: "Admin",
      icon: "admin",
      items: [
        { href: "/admin", label: "Tableau de bord", icon: "dashboard" },
        { href: "/admin/inscriptions", label: "Inscriptions", icon: "users" },
        { href: "/admin/formules", label: "Formules", icon: "tag" },
        { href: "/admin/structures", label: "Structures", icon: "admin" },
        { href: "/journal", label: "Journal", icon: "journal" },
      ],
    });
  } else {
    // Tableau de bord (standalone)
    groups.push({
      key: "dashboard",
      label: "Tableau",
      icon: "dashboard",
      items: [{ href: "/tableau", label: "Tableau de bord", icon: "dashboard" }],
    });

    // Caisse
    const caisseItems: Item[] = [];
    if (ticketAccess) {
      caisseItems.push({ href: "/caisse", label: "Caisse du jour", icon: "wallet" });
      caisseItems.push({ href: "/tickets", label: "Tickets", icon: "ticket" });
      caisseItems.push({ href: "/tickets/historique", label: "Historique", icon: "history" });
      caisseItems.push({ href: "/factures", label: "Factures", icon: "invoice" });
    }
    if (caisseItems.length) {
      groups.push({ key: "caisse", label: "Caisse", icon: "ticket", items: caisseItems });
    }

    // Clinique
    const cliniqueItems: Item[] = [];
    if (role === "structure_admin" || role === "docteur") {
      cliniqueItems.push({ href: "/ordonnances", label: "Ordonnances", icon: "ordonnance" });
    }
    if (adminAccess) {
      cliniqueItems.push({ href: "/soins", label: "Soins", icon: "care" });
      cliniqueItems.push({ href: "/tarifs", label: "Tarifs", icon: "tag" });
    }
    if (cliniqueItems.length) {
      groups.push({ key: "clinique", label: "Clinique", icon: "care", items: cliniqueItems });
    }

    // Administration
    if (adminAccess) {
      groups.push({
        key: "admin",
        label: "Admin",
        icon: "settings",
        items: [
          { href: "/utilisateurs", label: "Utilisateurs", icon: "users" },
          { href: "/reglages", label: "Réglages", icon: "settings" },
          { href: "/abonnement", label: "Abonnement", icon: "subscription" },
          { href: "/journal", label: "Journal", icon: "journal" },
        ],
      });
    }
  }

  const isGroupActive = (g: Group) =>
    g.items.some((it) => {
      if (it.href === "/tickets") {
        return pathname === "/tickets" || (pathname.startsWith("/tickets/") && pathname !== "/tickets/historique");
      }
      return pathname === it.href || pathname.startsWith(it.href + "/");
    });

  const openGroupData = groups.find((g) => g.key === openGroup && g.items.length > 1) ?? null;

  return (
    <aside
      ref={containerRef}
      className={`print:hidden sticky top-0 flex h-screen shrink-0 overflow-hidden bg-ink pb-3 pt-4 transition-[width] duration-200 ${
        openGroupData ? "w-[300px]" : "w-[104px]"
      }`}
    >
      <div className="flex w-[104px] shrink-0 flex-col items-center gap-1.5">
        {ticketAccess && role !== "platform_admin" && (
          <>
            <Link
              href="/tickets/nouveau"
              aria-label="Nouveau ticket"
              className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-accent shadow-[0_0_0_4px_#163545]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
            <div className="mb-2 text-[10px] font-bold text-white">Nouveau ticket</div>
          </>
        )}

        <nav className="flex flex-col items-center gap-1">
          {groups.map((g) => {
            const active = isGroupActive(g);
            const isOpen = openGroup === g.key;
            if (g.items.length === 1) {
              return (
                <Link
                  key={g.key}
                  href={g.items[0].href}
                  aria-current={active ? "page" : undefined}
                  className={`nv ${active ? "on" : ""}`}
                >
                  <Icon name={g.items[0].icon} />
                  {g.items[0].label}
                </Link>
              );
            }
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : g.key)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={`nv ${active || isOpen ? "on" : ""}`}
              >
                <Icon name={g.icon} />
                {g.label}
              </button>
            );
          })}
        </nav>
      </div>

      {openGroupData && (
        <div role="menu" className="flex w-[196px] shrink-0 flex-col gap-1 border-l border-white/10 px-3 pt-4">
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-nav">
            {openGroupData.label}
          </p>
          {openGroupData.items.map((it) => {
            const itActive =
              it.href === "/tickets"
                ? pathname === "/tickets" ||
                  (pathname.startsWith("/tickets/") && pathname !== "/tickets/historique")
                : pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                role="menuitem"
                onClick={() => setOpenGroup(null)}
                className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                  itActive ? "bg-accent text-white" : "text-nav hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon name={it.icon} />
                <span>{it.label}</span>

              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}