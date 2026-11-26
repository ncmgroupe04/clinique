"use client";

import { useEffect, useState, useActionState, useTransition } from "react";
import {
  toggleStructureActive,
  updateSubscription,
  toggleSuspended,
  toggleRegistrationFee,
  deletePlan,
  updatePlan,
} from "@/app/actions/admin";
import { PLAN_FEATURES } from "@/lib/plan-features";

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

export function DeletePlanButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deletePlan(fd);
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-danger-solid"
        style={{ height: 34, padding: "0 12px", borderRadius: 10, fontSize: 12, width: "auto" }}
      >
        Supprimer
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(11, 31, 42, 0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-ink">Supprimer la formule ?</h3>
            <p className="mt-2 text-sm text-muted">
              Cette action est définitive. Les structures utilisant cette formule seront
              rattachées à une autre formule.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary"
                style={{ height: 40, padding: "0 18px", borderRadius: 12, fontSize: 13 }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={pending}
                className="btn-danger-solid"
                style={{ height: 40, padding: "0 18px", borderRadius: 12, fontSize: 13, width: "auto" }}
                onClick={confirm}
              >
                {pending ? "…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminStructuresTable({
  structures,
  countMap,
}: {
  structures: Structure[];
  countMap: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Rechercher une structure…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          className="input"
          style={{ height: 40, fontSize: 14 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input appearance-none"
          style={{ height: 40, fontSize: 14, width: 200, paddingRight: 42 }}
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
                <th className="py-2 pr-3">Paiement</th>
                <th className="py-2 pr-3">Échéance mensuelle</th>
                <th className="py-2 pr-3">Statut</th>
                <th className="py-2 pr-3">Tickets</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s) => {
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
                            className={s.active
                              ? "rounded-[10px] bg-[#FDECEC] px-3 py-1.5 text-xs font-bold text-[#B42318] hover:bg-[#FADADA]"
                              : "rounded-[10px] bg-[#DFF3EF] px-3 py-1.5 text-xs font-bold text-[#0B5F54] hover:bg-[#CDEBE4]"}
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
      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="text-xs text-muted">
            Page {safePage} sur {totalPages} · {filtered.length} résultat(s)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="btn-secondary"
              style={{ height: 32, padding: "0 12px", borderRadius: 10, fontSize: 12 }}
            >
              Précédent
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
              .map((n, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && n - prev > 1;
                return (
                  <span key={n} className="flex items-center gap-1">
                    {showEllipsis && <span className="px-1 text-muted">…</span>}
                    <button
                      type="button"
                      onClick={() => setPage(n)}
                      className={n === safePage ? "go" : "btn-secondary"}
                      style={{ height: 32, width: 32, padding: 0, borderRadius: 10, fontSize: 12 }}
                    >
                      {n}
                    </button>
                  </span>
                );
              })}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="btn-secondary"
              style={{ height: 32, padding: "0 12px", borderRadius: 10, fontSize: 12 }}
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type PlanEdit = {
  id: string;
  name: string;
  monthly_price: number;
  duration_days: number;
  max_cashiers: number | null;
  max_docteurs: number | null;
  is_unlimited: boolean;
  is_public: boolean;
  max_documents_per_month: number | null;
  features: string[];
};

export function EditPlanButton({ plan }: { plan: PlanEdit }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updatePlan, {});
  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary text-xs"
        style={{ height: 34, padding: "0 12px", borderRadius: 10, width: "auto" }}
      >
        Modifier
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(11, 31, 42, 0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-ink">Modifier la formule</h3>
            <form action={action} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={plan.id} />
              <input name="name" defaultValue={plan.name} required className="input" style={{ height: 38, fontSize: 13 }} />
              <input name="monthly_price" type="number" min={0} defaultValue={plan.monthly_price} required className="input" style={{ height: 38, fontSize: 13 }} />
              <input name="duration_days" type="number" min={1} defaultValue={plan.duration_days} className="input" style={{ height: 38, fontSize: 13 }} />
              <input name="max_cashiers" type="number" min={0} defaultValue={plan.max_cashiers ?? ""} placeholder="Nb caissiers" className="input" style={{ height: 38, fontSize: 13 }} />
              <input name="max_docteurs" type="number" min={0} defaultValue={plan.max_docteurs ?? ""} placeholder="Nb docteurs" className="input" style={{ height: 38, fontSize: 13 }} />
              <input name="max_documents_per_month" type="number" min={1} defaultValue={plan.max_documents_per_month ?? ""} placeholder="Documents / mois" className="input" style={{ height: 38, fontSize: 13 }} />
              <div className="sm:col-span-2 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_unlimited" value="true" defaultChecked={plan.is_unlimited} className="accent-accent" /> Utilisateurs illimités</label>
                <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_public" value="true" defaultChecked={plan.is_public} className="accent-accent" /> Visible publiquement</label>
              </div>
              <div className="sm:col-span-2">
                <p className="lbl">Fonctionnalités incluses</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {PLAN_FEATURES.map((f) => (
                    <label key={f.value} className="flex items-center gap-1.5 text-xs text-ink">
                      <input type="checkbox" name="features" value={f.value} defaultChecked={plan.features.includes(f.value)} className="accent-accent" />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
              {state?.message && <p className="text-sm text-danger sm:col-span-2">{state.message}</p>}
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary" style={{ height: 38, borderRadius: 10, fontSize: 13 }}>Annuler</button>
                <button type="submit" disabled={pending} className="go" style={{ height: 38, padding: "0 16px", borderRadius: 10, fontSize: 13, width: "auto" }}>
                  {pending ? "…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
