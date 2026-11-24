"use client";

import { useActionState } from "react";
import { declareRenewalPayment, type RenewalState } from "@/app/actions/subscription-owner";

export default function RenewalForm() {
  const [state, action, pending] = useActionState<RenewalState, FormData>(declareRenewalPayment, undefined);
  return (
    <form action={action} className="mt-5 space-y-3 border-t border-border pt-5">
      <h3 className="text-sm font-bold text-ink">Déclarer un paiement</h3>
      <label className="lbl" htmlFor="reference">Référence de la transaction Wave</label>
      <input
        id="reference"
        name="reference"
        required
        minLength={3}
        placeholder="Ex. WV-123456789"
        className="input"
      />
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-accent" : "text-danger"}`}>{state.message}</p>
      )}
      <button type="submit" disabled={pending} className="btn-primary" style={{ height: 44, borderRadius: 12, fontSize: 14, width: "auto", padding: "0 20px" }}>
        {pending ? "Envoi…" : "J'ai payé — valider mon renouvellement"}
      </button>
    </form>
  );
}
