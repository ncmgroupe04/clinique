"use client";

import Link from "next/link";

export type NotificationAlert = {
  id: string;
  severity: "danger" | "warning" | "info";
  title: string;
  description: string;
  href?: string;
  label?: string;
};

type Severity = NotificationAlert["severity"];

const SEVERITY_GROUPS: {
  severity: Severity;
  title: string;
  subtitle: string;
  badge: string;
  accent: string;
  background: string;
  border: string;
  icon: string;
}[] = [
  {
    severity: "danger",
    title: "À traiter en priorité",
    subtitle: "Action immédiate requise",
    badge: "Urgent",
    accent: "#dc2626",
    background: "#fef2f2",
    border: "#fecaca",
    icon: "!",
  },
  {
    severity: "warning",
    title: "À surveiller",
    subtitle: "Paiements et échéances à suivre",
    badge: "Attention",
    accent: "#b45309",
    background: "#fff7ed",
    border: "#fed7aa",
    icon: "!",
  },
  {
    severity: "info",
    title: "Informations",
    subtitle: "Activité récente et catalogue des médicaments",
    badge: "Info",
    accent: "#0b7a6b",
    background: "#f0f8f6",
    border: "#bfe5dd",
    icon: "i",
  },
];

function plural(count: number, singular: string, multiple: string): string {
  return count > 1 ? multiple : singular;
}

export default function NotificationsClient({
  alerts,
}: {
  alerts: NotificationAlert[];
}) {
  const dangerCount = alerts.filter((a) => a.severity === "danger").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const actionableCount = dangerCount + warningCount;
  const infoCount = alerts.length - actionableCount;

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      {/* Résumé */}
      <section className="card flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-[13px] font-semibold text-muted">Centre de notifications</p>
          <p className="mt-1 text-xl font-extrabold text-ink">
            {actionableCount === 0
              ? "Aucune alerte à traiter"
              : `${actionableCount} ${plural(actionableCount, "alerte", "alertes")} à traiter`}
          </p>
          <p className="mt-1 text-sm text-muted">
            {alerts.length} {plural(alerts.length, "notification", "notifications")} au total ·{" "}
            {infoCount} {plural(infoCount, "information", "informations")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div
            className="min-w-[104px] rounded-xl px-4 py-3 text-center"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
          >
            <p className="text-2xl font-extrabold" style={{ color: "#dc2626" }}>
              {dangerCount}
            </p>
            <p className="text-xs font-semibold text-muted">Urgent</p>
          </div>
          <div
            className="min-w-[104px] rounded-xl px-4 py-3 text-center"
            style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}
          >
            <p className="text-2xl font-extrabold" style={{ color: "#b45309" }}>
              {warningCount}
            </p>
            <p className="text-xs font-semibold text-muted">Attention</p>
          </div>
          <div
            className="min-w-[104px] rounded-xl px-4 py-3 text-center"
            style={{ background: "#f0f8f6", border: "1px solid #bfe5dd" }}
          >
            <p className="text-2xl font-extrabold" style={{ color: "#0b7a6b" }}>
              {infoCount}
            </p>
            <p className="text-xs font-semibold text-muted">Info</p>
          </div>
        </div>
      </section>

      {/* État rassurant lorsqu'il n'y a aucune alerte danger / warning */}
      {actionableCount === 0 && (
        <section
          className="card"
          style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white"
              style={{ background: "#16a34a" }}
              aria-hidden="true"
            >
              ✓
            </span>
            <div>
              <h2 className="text-base font-extrabold" style={{ color: "#166534" }}>
                Tout est à jour
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#166534" }}>
                Aucune alerte critique ni paiement en attente. Votre abonnement est à jour.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Alertes groupées par sévérité */}
      {SEVERITY_GROUPS.map((group) => {
        const items = alerts.filter((alert) => alert.severity === group.severity);
        if (items.length === 0) return null;

        return (
          <section
            key={group.severity}
            className="card"
            style={{ background: group.background, borderColor: group.border }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white"
                  style={{ background: group.accent }}
                  aria-hidden="true"
                >
                  {group.icon}
                </span>
                <div>
                  <h2 className="text-lg font-extrabold" style={{ color: group.accent }}>
                    {group.title}
                  </h2>
                  <p className="text-xs font-medium text-muted">{group.subtitle}</p>
                </div>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  color: group.accent,
                  background: "#fff",
                  border: `1px solid ${group.border}`,
                }}
              >
                {items.length} {plural(items.length, "élément", "éléments")}
              </span>
            </div>

            <ul className="mt-4 divide-y" style={{ borderColor: group.border }}>
              {items.map((alert) => (
                <li
                  key={alert.id}
                  className="flex flex-wrap items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 max-w-2xl">
                    <p className="font-bold text-ink">{alert.title}</p>
                    <p className="mt-1 text-sm text-muted">{alert.description}</p>
                  </div>
                  {alert.href && (
                    <Link
                      href={alert.href}
                      className="btn-secondary"
                      style={{
                        height: 36,
                        padding: "0 12px",
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    >
                      {alert.label ?? "Ouvrir"}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
