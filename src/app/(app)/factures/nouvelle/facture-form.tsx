"use client";

import { useActionState, useState } from "react";
import { createInvoice, type InvoiceState } from "@/app/actions/invoices";
import { useRouter } from "next/navigation";

type Care = { id: string; name: string; price: number; unit: string; category: string; cotation?: string | null };
type Category = { name: string; slug: string; active: boolean };
type Line = { careId: string; name: string; price: string; qty: number; unit: string; cotation: string };

const DEFAULT_CATEGORIES: Category[] = [
  { name: "Diagnostic", slug: "diagnostic", active: true },
  { name: "Intervention", slug: "intervention", active: true },
  { name: "Produit", slug: "produit", active: true },
  { name: "Dentiste", slug: "dentiste", active: true },
];

function fcfa(v: number): string {
  return `${v.toLocaleString("fr-FR")} F CFA`;
}

export default function FactureForm({ cares, categories }: { cares: Care[]; categories: Category[] }) {
  const effectiveCategories = categories.length ? categories : DEFAULT_CATEGORIES;
  const router = useRouter();
  const [state, action, pending] = useActionState<InvoiceState, FormData>(createInvoice, undefined);
  const [lines, setLines] = useState<Line[]>([]);
  const [patientName, setPatientName] = useState("");
  const [discount, setDiscount] = useState("");
  const [advance, setAdvance] = useState("");

  // Sélection en cours (cases cochées)
  const [selected, setSelected] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [priceOverride, setPriceOverride] = useState("");

  if (state?.success && state.invoiceId) {
    router.push(`/factures/${state.invoiceId}`);
  }

  function toggleCare(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addSelected() {
    if (selected.length === 0) return;
    const override = priceOverride.trim() === "" ? null : Number(priceOverride);
    setLines((prev) => {
      const next = [...prev];
      for (const id of selected) {
        const care = cares.find((c) => c.id === id);
        if (!care) continue;
        const price = override !== null && Number.isFinite(override) && override >= 0 ? String(override) : String(care.price);
        const existing = next.findIndex((l) => l.careId === care.id);
        if (existing >= 0) {
          next[existing] = { ...next[existing], qty: next[existing].qty + qty, price };
        } else {
          next.push({ careId: care.id, name: care.name, price, qty, unit: care.unit ?? "unité", cotation: care.cotation ?? "" });
        }
      }
      return next;
    });
    setSelected([]);
    setQty(1);
    setPriceOverride("");
  }

  const removeLine = (careId: string) => setLines((prev) => prev.filter((l) => l.careId !== careId));
  const setQtyLine = (careId: string, value: number) =>
    setLines((prev) => prev.map((l) => (l.careId === careId ? { ...l, qty: Math.max(1, value) } : l)));
  const setPriceLine = (careId: string, value: string) =>
    setLines((prev) => prev.map((l) => (l.careId === careId ? { ...l, price: value.replace(/[^0-9]/g, "") } : l)));
  const setCotationLine = (careId: string, value: string) =>
    setLines((prev) => prev.map((l) => (l.careId === careId ? { ...l, cotation: value } : l)));

  const discountValue = Number(discount) || 0;
  const advanceValue = Number(advance) || 0;
  const subtotal = lines.reduce((s, l) => s + (Number(l.price) || 0) * l.qty, 0);
  const total = Math.max(0, subtotal - discountValue);
  const reste = Math.max(0, total - advanceValue);

  const itemsJson = JSON.stringify(
    lines.map((l) => ({ care_id: l.careId, care_name: l.name, quantity: l.qty, unit_price: Number(l.price) || 0, cotation: l.cotation })),
  );

  return (
    <form action={action} className="flex flex-1 flex-col gap-6 lg:flex-row">
      <input type="hidden" name="items" value={itemsJson} />
      <section className="card flex min-w-0 flex-1 flex-col gap-5">
        <div>
          <label className="lbl" htmlFor="patient_name">Nom et prénom</label>
          <input
            id="patient_name"
            name="patient_name"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="input"
          />
        </div>

        {/* Liste à cocher groupée par catégorie */}
        <div>
          <span className="lbl">Ajouter un soin</span>
          {cares.length === 0 ? (
            <p className="text-sm text-muted">Aucun soin actif dans le catalogue.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[...effectiveCategories.filter((c) => c.active), ...(cares.some((c) => !effectiveCategories.some((cat) => cat.active && (c.category ?? "intervention") === cat.slug)) ? [{ slug: "__other__", name: "Autres", active: true }] : [])].map((group) => {
                const items = group.slug === "__other__"
                  ? cares.filter((c) => !effectiveCategories.some((cat) => cat.active && (c.category ?? "intervention") === cat.slug))
                  : cares.filter((c) => (c.category ?? "intervention") === group.slug);
                return (
                  <div key={group.slug} className="rounded-[18px] border border-border bg-white p-4">
                    <h3 className="mb-2 text-sm font-extrabold text-ink">{group.name}</h3>
                    <div className="space-y-1.5">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted">Aucun soin.</p>
                      ) : (
                        items.map((care) => (
                          <label
                            key={care.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-ink hover:bg-bg"
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(care.id)}
                              onChange={() => toggleCare(care.id)}
                              className="h-4 w-4 shrink-0 accent-accent"
                            />
                            <span className="truncate">{care.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-input-border bg-white px-2" style={{ height: 52 }}>
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="x" style={{ width: 30, height: 30, fontSize: 16 }}>−</button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} className="x" style={{ width: 30, height: 30, fontSize: 16 }}>+</button>
            </div>
            <input
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="Prix ou remise (optionnel)"
              className="input flex-1"
              style={{ minWidth: 180 }}
            />
            <button
              type="button"
              onClick={addSelected}
              disabled={selected.length === 0}
              className="btn-secondary"
              style={{ height: 52, borderRadius: 14, fontSize: 14, width: "auto" }}
            >
              Ajouter à la facture
            </button>
          </div>
        </div>

        {/* Lignes de la facture */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted">
                <th className="py-2">Nom du soin</th>
                <th className="py-2 text-center">Indice</th>
                <th className="py-2 text-center">Quantité</th>
                <th className="py-2 text-right">Prix unitaire</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr><td colSpan={6} className="py-3 text-sm text-muted">Aucun soin ajouté.</td></tr>
              ) : (
                lines.map((l) => (
                  <tr key={l.careId} className="border-b border-border">
                    <td className="py-2 font-semibold">{l.name}</td>
                    <td className="py-2 text-center">
                      <input
                        type="text"
                        aria-label={`Indice ${l.name}`}
                        value={l.cotation}
                        onChange={(e) => setCotationLine(l.careId, e.target.value)}
                        maxLength={50}
                        placeholder="—"
                        className="input text-center"
                        style={{ width: 84, height: 38, padding: "0 8px" }}
                      />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => setQtyLine(l.careId, l.qty - 1)} className="x" style={{ width: 28, height: 28, fontSize: 14 }}>−</button>
                        <span className="w-7 text-center font-bold">{l.qty}</span>
                        <button type="button" onClick={() => setQtyLine(l.careId, l.qty + 1)} className="x" style={{ width: 28, height: 28, fontSize: 14 }}>+</button>
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Prix unitaire ${l.name}`}
                        value={l.price}
                        onChange={(e) => setPriceLine(l.careId, e.target.value)}
                        className="input text-right"
                        style={{ width: 110, height: 38, padding: "0 10px" }}
                      />
                    </td>
                    <td className="py-2 text-right font-bold">{fcfa((Number(l.price) || 0) * l.qty)}</td>
                    <td className="py-2 text-right">
                      <button type="button" onClick={() => removeLine(l.careId)} className="x" style={{ width: 28, height: 28, fontSize: 13 }}>×</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="lbl" htmlFor="discount">Remise (F CFA)</label>
            <input
              id="discount"
              name="discount"
              type="text"
              inputMode="numeric"
              value={discount}
              onChange={(e) => setDiscount(e.target.value.replace(/[^0-9]/g, ""))}
              className="input"
            />
          </div>
          <div>
            <label className="lbl" htmlFor="advance">Avance payée (F CFA)</label>
            <input
              id="advance"
              name="advance"
              type="text"
              inputMode="numeric"
              value={advance}
              onChange={(e) => setAdvance(e.target.value.replace(/[^0-9]/g, ""))}
              className="input"
            />
          </div>
        </div>

        {state?.message && !state.success && (
          <p className="text-sm text-danger">{state.message}</p>
        )}
      </section>

      <aside className="flex w-full flex-col gap-4 lg:w-[360px] lg:shrink-0">
        <section className="card flex flex-1 flex-col gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Récapitulatif</h3>
          <div className="row"><span>Sous-total</span><span className="font-bold">{fcfa(subtotal)}</span></div>
          <div className="row"><span>Remise</span><span className="font-bold">−{fcfa(discountValue)}</span></div>
          <div className="border-t border-border pt-2">
            <div className="row" style={{ fontSize: 16, fontWeight: 800 }}><span>Total</span><span>{fcfa(total)}</span></div>
          </div>
          <div className="row"><span>Avance</span><span className="font-bold">{fcfa(advanceValue)}</span></div>
          <div className="row" style={{ fontSize: 16, fontWeight: 800, color: "#0b5f54" }}>
            <span>Reste à payer</span><span>{fcfa(reste)}</span>
          </div>
        </section>
        <button type="submit" disabled={pending || lines.length === 0} className="go">
          {pending ? "Enregistrement…" : "Enregistrer la facture"}
        </button>
      </aside>
    </form>
  );
}
