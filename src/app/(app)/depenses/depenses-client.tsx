"use client";

import { useState } from "react";
import { DEPENSE_CATEGORIES, formatCfa, type DepenseRow } from "@/lib/depenses";

export type DepenseCategorieTotal = {
  categorie: string;
  actif: number;
  annule: number;
  count: number;
};

export type DepensesTotals = {
  actif: number;
  annule: number;
  countActif: number;
  countAnnule: number;
  parCategorie: DepenseCategorieTotal[];
};

export type DepensesData = {
  depenses: DepenseRow[];
  totals: DepensesTotals;
};

const STATUTS = [
  { value: "all", label: "Tous les statuts" },
  { value: "actif", label: "Actives" },
  { value: "annule", label: "Annulées" },
] as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function computeTotals(rows: DepenseRow[]): DepensesTotals {
  const parCategorie: DepenseCategorieTotal[] = DEPENSE_CATEGORIES.map((categorie) => ({
    categorie,
    actif: 0,
    annule: 0,
    count: 0,
  }));

  let actif = 0;
  let annule = 0;
  let countActif = 0;
  let countAnnule = 0;

  for (const d of rows) {
    const isAnnule = d.status === "annule";
    if (isAnnule) {
      annule += d.montant;
      countAnnule += 1;
    } else {
      actif += d.montant;
      countActif += 1;
    }
    const ligne = parCategorie.find((t) => t.categorie === d.categorie);
    if (ligne) {
      if (isAnnule) ligne.annule += d.montant;
      else ligne.actif += d.montant;
      ligne.count += 1;
    }
  }

  return { actif, annule, countActif, countAnnule, parCategorie };
}

function applyDepense(rows: DepenseRow[], updated: DepenseRow): DepenseRow[] {
  if (!updated?.id) return rows;
  const exists = rows.some((r) => r.id === updated.id);
  const next = exists
    ? rows.map((r) => (r.id === updated.id ? updated : r))
    : [updated, ...rows];
  return next.sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
  );
}

export default function DepensesClient({ initial }: { initial: DepensesData }) {
  const [data, setData] = useState<DepensesData>(initial);
  const [categorie, setCategorie] = useState("all");
  const [statut, setStatut] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<DepenseRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const filtered = data.depenses.filter(
    (d) =>
      (categorie === "all" || d.categorie === categorie) &&
      (statut === "all" || d.status === statut),
  );
  const hasFilter = categorie !== "all" || statut !== "all";

  async function submitDepense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPending(true);
    setFormError(null);
    setActionError(null);
    try {
      const res = await fetch("/api/depenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: fd.get("date"),
          libelle: fd.get("libelle"),
          categorie: fd.get("categorie"),
          montant: Number(fd.get("montant")),
          note: fd.get("note") ?? "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Ajout impossible.");
      const created = json?.depense as DepenseRow;
      if (!created?.id) throw new Error("Réponse inattendue du serveur.");
      setData((prev) => {
        const depenses = applyDepense(prev.depenses, created);
        return { depenses, totals: computeTotals(depenses) };
      });
      form.reset();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Ajout impossible.");
    } finally {
      setPending(false);
    }
  }

  async function confirmCancel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cancelTarget) return;
    setPending(true);
    setCancelError(null);
    setActionError(null);
    try {
      // L'annulation est implémentée par PATCH /api/depenses (cf. caisse-client).
      const res = await fetch("/api/depenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cancelTarget.id, reason: cancelReason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Annulation impossible.");
      const updated = json?.depense as DepenseRow;
      if (!updated?.id) throw new Error("Réponse inattendue du serveur.");
      setData((prev) => {
        const depenses = applyDepense(prev.depenses, updated);
        return { depenses, totals: computeTotals(depenses) };
      });
      setCancelTarget(null);
      setCancelReason("");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Annulation impossible.");
    } finally {
      setPending(false);
    }
  }

  async function restoreDepense(id: string) {
    setPending(true);
    setActionError(null);
    try {
      const res = await fetch("/api/depenses/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Rétablissement impossible.");
      const updated = json?.depense as DepenseRow;
      if (!updated?.id) throw new Error("Réponse inattendue du serveur.");
      setData((prev) => {
        const depenses = applyDepense(prev.depenses, updated);
        return { depenses, totals: computeTotals(depenses) };
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Rétablissement impossible.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Indicateurs */}
      <div className="card grid grid-cols-2 gap-5 lg:grid-cols-4">
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Total actif</p>
          <p className="mt-1 text-xl font-extrabold text-accent">
            {formatCfa(data.totals.actif)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Dépenses comptées dans la caisse</p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Dépenses actives</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{data.totals.countActif}</p>
          <p className="mt-1 text-[11px] text-muted">Lignes en cours</p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Total annulé</p>
          <p className="mt-1 text-xl font-extrabold text-danger">
            {formatCfa(data.totals.annule)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Hors solde de la caisse</p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Dépenses annulées</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{data.totals.countAnnule}</p>
          <p className="mt-1 text-[11px] text-muted">Conservées pour l&apos;historique</p>
        </div>
      </div>

      {/* Répartition par catégorie */}
      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Répartition par catégorie</h2>
          <span className="text-[13px] font-semibold text-muted">
            Totaux actifs et annulés
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {data.totals.parCategorie.map((t) => (
            <div
              key={t.categorie}
              className="rounded-[14px] border border-border bg-bg px-3 py-3"
            >
              <p className="text-[13px] font-bold text-ink">{t.categorie}</p>
              <p className="mt-1 text-base font-extrabold text-accent">
                {formatCfa(t.actif)}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {t.count} dépense(s)
                {t.annule > 0 ? ` · ${formatCfa(t.annule)} annulée(s)` : ""}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Filtres et ajout */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className="in"
          style={{ height: 44, width: "auto", minWidth: 210 }}
          aria-label="Filtrer par catégorie"
        >
          <option value="all">Toutes les catégories</option>
          {DEPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="in"
          style={{ height: 44, width: "auto", minWidth: 180 }}
          aria-label="Filtrer par statut"
        >
          {STATUTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setCategorie("all");
              setStatut("all");
            }}
            className="btn-secondary"
            style={{ height: 44, padding: "0 14px", borderRadius: 12, fontSize: 13, width: "auto" }}
          >
            Effacer les filtres
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
          }}
          className="btn-primary ml-auto"
          style={{ height: 46, padding: "0 20px", borderRadius: 14, fontSize: 14, width: "auto" }}
        >
          {showForm ? "Fermer" : "+ Nouvelle dépense"}
        </button>
      </div>

      {actionError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {actionError}
        </p>
      )}

      {/* Formulaire d'ajout */}
      {showForm && (
        <form onSubmit={submitDepense} className="card flex flex-col gap-4">
          <h2 className="text-lg font-extrabold">Nouvelle dépense</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="lbl" htmlFor="dep-date">
                Date
              </label>
              <input
                id="dep-date"
                name="date"
                type="date"
                defaultValue={today()}
                required
                className="in"
              />
            </div>
            <div>
              <label className="lbl" htmlFor="dep-libelle">
                Libellé
              </label>
              <input
                id="dep-libelle"
                name="libelle"
                placeholder="Achat de gants"
                required
                maxLength={200}
                className="in"
              />
            </div>
            <div>
              <label className="lbl" htmlFor="dep-categorie">
                Catégorie
              </label>
              <select
                id="dep-categorie"
                name="categorie"
                required
                className="in"
                defaultValue="Fournitures"
              >
                {DEPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="lbl" htmlFor="dep-montant">
                Montant (F CFA)
              </label>
              <input
                id="dep-montant"
                name="montant"
                type="number"
                min={0}
                step={1}
                placeholder="5 000"
                required
                className="in"
              />
            </div>
          </div>
          <div>
            <label className="lbl" htmlFor="dep-note">
              Note (optionnel)
            </label>
            <input
              id="dep-note"
              name="note"
              maxLength={500}
              placeholder="Fournisseur, référence…"
              className="in"
            />
          </div>
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary"
              style={{ height: 46, padding: "0 20px", borderRadius: 14, fontSize: 14 }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="btn-primary"
              style={{ height: 46, padding: "0 22px", borderRadius: 14, fontSize: 14, width: "auto" }}
            >
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}

      {/* Liste des dépenses */}
      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Dépenses / Sorties de caisse</h2>
          <span className="text-[13px] font-semibold text-muted">
            {pending ? "Chargement…" : `${filtered.length} ligne(s)`}
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-3 text-sm text-muted">
            {hasFilter
              ? "Aucune dépense ne correspond à ces filtres."
              : "Aucune dépense enregistrée. Utilise « + Nouvelle dépense » pour en ajouter."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {d.libelle}
                    <span
                      className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        d.status === "annule"
                          ? "bg-[#FDECEC] text-[#B42318]"
                          : "bg-accent-light text-accent-text"
                      }`}
                    >
                      {d.status === "annule" ? "Annulée" : "Active"}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {fmtDate(d.date)} · {d.categorie}
                    {d.note ? ` · ${d.note}` : ""}
                    {d.status === "annule" && d.cancel_reason
                      ? ` · Motif : ${d.cancel_reason}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <b
                    className={`text-lg ${
                      d.status === "annule" ? "text-muted line-through" : "text-ink"
                    }`}
                  >
                    {formatCfa(d.montant)}
                  </b>
                  {d.status === "actif" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setCancelTarget(d);
                        setCancelReason("");
                        setCancelError(null);
                      }}
                      className="rounded-[10px] bg-[#FDECEC] px-3 py-1.5 text-xs font-bold text-[#B42318] hover:bg-[#FADADA] disabled:opacity-60"
                    >
                      Annuler
                    </button>
                  )}
                  {d.status === "annule" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void restoreDepense(d.id)}
                      className="rounded-[10px] bg-[#DFF3EF] px-3 py-1.5 text-xs font-bold text-[#0B5F54] hover:bg-[#CDEBE4] disabled:opacity-60"
                    >
                      Rétablir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modale d'annulation */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(11, 31, 42, 0.55)" }}
          onClick={() => {
            if (!pending) setCancelTarget(null);
          }}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-ink">Annuler cette dépense ?</h3>
            <p className="mt-2 text-sm text-muted">
              {cancelTarget.libelle} — {formatCfa(cancelTarget.montant)}. Elle restera
              visible, marquée « annulée », et ne sera plus comptée dans le solde.
            </p>
            <form onSubmit={confirmCancel} className="mt-4">
              <label className="lbl" htmlFor="cancel-reason">
                Motif
              </label>
              <input
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
                minLength={3}
                maxLength={200}
                placeholder="Erreur de saisie, doublon…"
                className="in"
              />
              {cancelError && <p className="mt-2 text-sm text-danger">{cancelError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  className="btn-secondary"
                  style={{ height: 42, padding: "0 18px", borderRadius: 12, fontSize: 13 }}
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-danger-solid"
                  style={{ height: 42, padding: "0 18px", borderRadius: 12, fontSize: 13, width: "auto" }}
                >
                  {pending ? "…" : "Annuler la dépense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
