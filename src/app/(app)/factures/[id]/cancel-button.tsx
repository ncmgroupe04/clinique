"use client";

import { useState } from "react";
import { cancelInvoice } from "@/app/actions/invoices";

export default function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setPending(true);
    const fd = new FormData();
    fd.set("id", invoiceId);
    fd.set("reason", reason);
    const res = await cancelInvoice(undefined as never, fd);
    setPending(false);
    if (res?.success) {
      setOpen(false);
      setReason("");
    } else {
      setMessage(res?.message ?? "Erreur");
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-danger-solid" style={{ height: 44, padding: "0 16px", borderRadius: 12, fontSize: 14, width: "auto" }}>
        Annuler la facture
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <label className="lbl" htmlFor="cancel-reason">Motif d&apos;annulation (obligatoire)</label>
      <input
        id="cancel-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="input"
        style={{ height: 40 }}
      />
      {message && <p className="text-sm text-danger">{message}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending || reason.trim().length < 3} onClick={submit} className="btn-danger-solid" style={{ height: 40, padding: "0 16px", borderRadius: 10, fontSize: 13, width: "auto" }}>
          {pending ? "…" : "Confirmer"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setMessage(null); }} className="btn-secondary" style={{ height: 40, borderRadius: 10, fontSize: 13 }}>
          Annuler
        </button>
      </div>
    </div>
  );
}
