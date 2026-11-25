"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCfa } from "@/lib/format";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/payments";

export default function EncaisserButton({
  documentType,
  documentId,
  remaining,
  onSuccess,
}: {
  documentType: "ticket" | "facture";
  documentId: string;
  remaining: number;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState<PaymentMethod>("especes");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (remaining <= 0 || done) {
    return <p className="text-center text-xs font-semibold text-accent">Soldé</p>;
  }

  function openModal() {
    setAmount(String(remaining));
    setMethod("especes");
    setNote("");
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: documentType === "ticket" ? documentId : undefined,
          invoice_id: documentType === "facture" ? documentId : undefined,
          amount: Number(amount),
          method,
          note,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Encaissement impossible.");
      setOpen(false);
      setDone(true);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encaissement impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="btn-primary"
        style={{ height: 44, padding: "0 18px", borderRadius: 12, fontSize: 14, width: "auto" }}
      >
        Encaisser le reste
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(11, 31, 42, 0.55)" }}
          onClick={() => {
            if (!pending) setOpen(false);
          }}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-ink">Encaisser le reste</h3>
            <p className="mt-2 text-sm text-muted">
              Reste à payer : <b className="text-ink">{formatCfa(remaining)}</b>
            </p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div>
                <label className="lbl" htmlFor="pay-amount">
                  Montant (F CFA)
                </label>
                <input
                  id="pay-amount"
                  type="number"
                  min={1}
                  max={remaining}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="in"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="pay-method">
                  Moyen de paiement
                </label>
                <select
                  id="pay-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="in"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lbl" htmlFor="pay-note">
                  Note (optionnel)
                </label>
                <input
                  id="pay-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  className="in"
                  placeholder="Référence, précision…"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary"
                  style={{ height: 42, padding: "0 18px", borderRadius: 12, fontSize: 13 }}
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-primary"
                  style={{ height: 42, padding: "0 20px", borderRadius: 12, fontSize: 13, width: "auto" }}
                >
                  {pending ? "Encaissement…" : "Encaisser"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
