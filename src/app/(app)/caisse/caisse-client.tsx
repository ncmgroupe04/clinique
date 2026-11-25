"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EncaisserButton from "../encaisser-button";
import {
  CAISSE_PERIODS,
  DEPENSE_CATEGORIES,
  formatCfa,
  type CaisseData,
  type CaissePeriod,
  type DepenseRow,
} from "@/lib/depenses";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default function CaisseClient({ initial }: { initial: CaisseData }) {
  const [period, setPeriod] = useState<CaissePeriod>(initial.period);
  const [categorie, setCategorie] = useState<string>(initial.categorie ?? "all");
  const [data, setData] = useState<CaisseData>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<DepenseRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [depenseActionError, setDepenseActionError] = useState<string | null>(null);

  const firstRun = useRef(true);
  const reqId = useRef(0);

  const load = useCallback(async (p: CaissePeriod, c: string) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ period: p });
      if (c && c !== "all") qs.set("categorie", c);
      const res = await fetch(`/api/caisse?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Chargement impossible.");
      if (id !== reqId.current) return;
      setData(json as CaisseData);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    void load(period, categorie);
  }, [period, categorie, load]);

  async function submitDepense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPending(true);
    setFormError(null);
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
      form.reset();
      setShowForm(false);
      await load(period, categorie);
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
    try {
      const res = await fetch("/api/depenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cancelTarget.id, reason: cancelReason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Annulation impossible.");
      setCancelTarget(null);
      setCancelReason("");
      await load(period, categorie);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Annulation impossible.");
    } finally {
      setPending(false);
    }
  }

  async function restoreDepense(id: string) {
    setPending(true);
    setDepenseActionError(null);
    try {
      const res = await fetch("/api/depenses/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Rétablissement impossible.");
      await load(period, categorie);
    } catch (err) {
      setDepenseActionError(err instanceof Error ? err.message : "Rétablissement impossible.");
    } finally {
      setPending(false);
    }
  }

  const { summary, depenses } = data;
  const soldePositive = summary.solde >= 0;

  return (
    <>
      {/* Indicateurs */}
      <div className="card grid grid-cols-2 gap-5 lg:grid-cols-4">
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Encaissements</p>
          <p className="mt-1 text-xl font-extrabold text-accent">{formatCfa(summary.encaisseTotal)}</p>
          <p className="mt-1 text-[11px] text-muted">
            Tickets {formatCfa(summary.encaisseTickets)} · Factures {formatCfa(summary.encaisseFactures)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Dépenses</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{formatCfa(summary.depensesTotal)}</p>
          <p className="mt-1 text-[11px] text-muted">{summary.depensesCount} dépense(s) active(s)</p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Solde</p>
          <p className={`mt-1 text-xl font-extrabold ${soldePositive ? "text-accent" : "text-danger"}`}>
            {formatCfa(summary.solde)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Encaissements − dépenses</p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted">Période</p>
          <p className="mt-1 text-xl font-extrabold text-ink">
            {CAISSE_PERIODS.find((p) => p.value === period)?.label ?? "Aujourd'hui"}
          </p>
          <p className="mt-1 text-[11px] text-muted">Filtre des totaux</p>
        </div>
      </div>

      {/* Restes à recouvrer */}
      {data.outstanding.length > 0 && (
        <section className="card" id="restes">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">Restes à recouvrer</h2>
            <span className="text-[13px] font-semibold text-muted">
              {data.outstanding.length} document(s) · {formatCfa(data.outstandingTotal)}
            </span>
          </div>
          <div className="divide-y divide-border">
            {data.outstanding.map((d) => (
              <div key={`${d.type}-${d.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {d.reference} · {d.patient_name}
                  </p>
                  <p className="text-xs text-muted">
                    Total {formatCfa(d.total)} · Encaissé {formatCfa(d.advance)} · Reste{" "}
                    <b className="text-danger">{formatCfa(d.remaining)}</b>
                  </p>
                </div>
                <EncaisserButton
                  documentType={d.type === "ticket" ? "ticket" : "facture"}
                  documentId={d.id}
                  remaining={d.remaining}
                  onSuccess={() => load(period, categorie)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        {CAISSE_PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              period === p.value
                ? "border-accent bg-accent text-white"
                : "border-input-border bg-white text-ink hover:bg-bg"
            }`}
          >
            {p.label}
          </button>
        ))}
        <select
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className="in"
          style={{ height: 44, width: "auto", minWidth: 190 }}
          aria-label="Filtrer par catégorie"
        >
          <option value="all">Toutes catégories</option>
          {DEPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
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
              <input id="dep-date" name="date" type="date" defaultValue={today()} required className="in" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
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
              <select id="dep-categorie" name="categorie" required className="in" defaultValue="Fournitures">
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
            <input id="dep-note" name="note" maxLength={500} placeholder="Fournisseur, référence…" className="in" />
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
      <section className="card" id="depenses">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Dépenses</h2>
          <span className="text-[13px] font-semibold text-muted">
            {loading ? "Chargement…" : `${depenses.length} ligne(s)`}
          </span>
        </div>

        {depenseActionError && (
          <p className="mb-3 rounded-[10px] bg-[#FDECEC] px-3 py-2 text-sm font-semibold text-[#B42318]">
            {depenseActionError}
          </p>
        )}

        {depenses.length === 0 ? (
          <p className="py-3 text-sm text-muted">
            Aucune dépense sur cette période. Utilise « + Nouvelle dépense » pour en ajouter.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {depenses.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {d.libelle}
                    {d.status === "annule" && (
                      <span className="ml-2 text-xs font-semibold text-danger">(annulée)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {fmtDate(d.date)} · {d.categorie}
                    {d.note ? ` · ${d.note}` : ""}
                    {d.status === "annule" && d.cancel_reason ? ` · Motif : ${d.cancel_reason}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <b className={`text-lg ${d.status === "annule" ? "text-muted line-through" : "text-ink"}`}>
                    {formatCfa(d.montant)}
                  </b>
                  {d.status === "actif" && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelTarget(d);
                        setCancelReason("");
                        setCancelError(null);
                      }}
                      className="rounded-[10px] bg-[#FDECEC] px-3 py-1.5 text-xs font-bold text-[#B42318] hover:bg-[#FADADA]"
                    >
                      Annuler
                    </button>
                  )}
                  {d.status === "annule" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void restoreDepense(d.id)}
                      className="rounded-[10px] bg-[#DFF3EF] px-3 py-1.5 text-xs font-bold text-[#0B5F54] hover:bg-[#CDEBE4]"
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
              {cancelTarget.libelle} — {formatCfa(cancelTarget.montant)}. Elle restera visible, marquée
              « annulée », et ne sera plus comptée dans le solde.
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
    </>
  );
}
