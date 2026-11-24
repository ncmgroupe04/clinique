"use client";

import { useState } from "react";
import {
  toggleStructureActive,
  updateSubscription,
  toggleSuspended,
  toggleRegistrationFee,
} from "@/app/actions/admin";

type Structure = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  plan: string | null;
  subscription_ends_at: string | null;
  suspended: boolean;
  registration_fee_paid: boolean;
};

const STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actifs" },
  { value: "suspended", label: "Suspendus" },
  { value: "expired", label: "Expirés" },
  { value: "deactivated", label: "Désactivés" },
];

export default function AdminStructuresTable({
  structures,
  countMap,
}: {
  structures: Structure[];
  countMap: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const now = new Date();
  const filtered = structures.filter((s) => {
    const q = query.trim().toLowerCase();
    if (q && !s.name.toLowerCase().includes(q)) return false;
    if (statusFilter === "all") return true;
    const endsAt = s.subscription_ends_at ? new Date(s.subscription_ends_at) : null;
    const expired = endsAt ? endsAt < now : false;
    const status = !s.active
      ? "deactivated"
      : s.suspended
        ? "suspended"
        : expired
          ? "expired"
          : "active";
    return status === statusFilter;
  });

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Rechercher une structure…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
          style={{ height: 40, fontSize: 14 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input appearance-none"
          style={{ height: 40, fontSize: 14, width: 200, paddingRight: 36 }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted sm:ml-auto">
          {filtered.length} / {structures.length} structure(s)
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">Aucune structure correspondante.</p>
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
              {filtered.map((s) => {
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
                    <td className="py-3 pr-3">{countMap[s.id] ?? 0}</td>
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
    </div>
  );
}
