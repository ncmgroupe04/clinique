"use client";

import { useActionState, useState } from "react";
import { createInvoice, type InvoiceState } from "@/app/actions/invoices";
import { useRouter } from "next/navigation";

type Care = { id: string; name: string; price: number; unit: string };
type Line = { careId: string; name: string; price: number; qty: number; unit: string };

function fcfa(v: number): string {
  return `${v.toLocaleString("fr-FR")} F`;
}

export default function FactureForm({ cares }: { cares: Care[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<InvoiceState, FormData>(createInvoice, undefined);
  const [lines, setLines] = useState<Line[]>([]);
  const [patientName, setPatientName] = useState("");
  const [discount, setDiscount] = useState(0);
  const [advance, setAdvance] = useState(0);

  // redirect on success
  if (state?.success && state.invoiceId) {
    router.push(`/factures/${state.invoiceId}`);
  }

  const addLine = (care: Care) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.careId === care.id);
      if (existing) {
        return prev.map((l) => (l.careId === care.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { careId: care.id, name: care.name, price: care.price, qty: 1, unit: care.unit ?? "unité" }];
    });
  };

  const removeLine = (careId: string) => setLines((prev) => prev.filter((l) => l.careId !== careId));
  const setQty = (careId: string, qty: number) =>
    setLines((prev) => prev.map((l) => (l.careId === careId ? { ...l, qty: Math.max(1, qty) } : l)));

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const reste = Math.max(0, total - advance);

  const itemsJson = JSON.stringify(
    lines.map((l) => ({ care_name: l.name, quantity: l.qty, unit_price: l.price })),
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

        <div>
          <label className="lbl" htmlFor="care-select">Ajouter un soin</label>
          <div className="flex gap-2">
            <select
              id="care-select"
              value=""
              onChange={(e) => {
                const care = cares.find((c) => c.id === e.target.value);
                if (care) addLine(care);
              }}
              className="input flex-1"
            >
              <option value="">Choisir un soin…</option>
              {cares.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {fcfa(c.price)}{c.unit && c.unit !== "unité" ? ` / ${c.unit}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-ink">Soins</h3>
          {lines.length === 0 ? (
            <p className="text-sm text-muted">Aucun soin ajouté.</p>
          ) : (
            lines.map((l) => (
              <div key={l.careId} className="flex items-center gap-2 rounded-xl border border-border bg-bg p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{l.name}</p>
                  <p className="text-xs text-muted">{fcfa(l.price)} / {l.unit === "unité" ? "unité" : l.unit}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setQty(l.careId, l.qty - 1)} className="x" style={{ width: 32, height: 32, fontSize: 16 }}>−</button>
                  <span className="w-8 text-center font-bold">{l.qty}</span>
                  <button type="button" onClick={() => setQty(l.careId, l.qty + 1)} className="x" style={{ width: 32, height: 32, fontSize: 16 }}>+</button>
                </div>
                <span className="w-20 text-right text-sm font-bold">{fcfa(l.price * l.qty)}</span>
                <button type="button" onClick={() => removeLine(l.careId)} className="x" style={{ width: 32, height: 32, fontSize: 14 }}>×</button>
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="lbl" htmlFor="discount">Remise (F CFA)</label>
            <input
              id="discount"
              name="discount"
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="input"
            />
          </div>
          <div>
            <label className="lbl" htmlFor="advance">Avance payée (F CFA)</label>
            <input
              id="advance"
              name="advance"
              type="number"
              min={0}
              value={advance}
              onChange={(e) => setAdvance(Number(e.target.value) || 0)}
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
          <div className="row"><span>Remise</span><span className="font-bold">−{fcfa(discount)}</span></div>
          <div className="border-t border-border pt-2">
            <div className="row" style={{ fontSize: 16, fontWeight: 800 }}><span>Total</span><span>{fcfa(total)}</span></div>
          </div>
          <div className="row"><span>Avance</span><span className="font-bold">{fcfa(advance)}</span></div>
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
