"use client";

import { useActionState, useState } from "react";
import { createTicket, type CreateTicketState } from "@/app/actions/tickets";
import { formatCfa } from "@/lib/format";

type Service = { id: string; name: string; price: number };

export default function NouveauTicketForm({
  services,
  isAdmin,
}: {
  services: Service[];
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState<CreateTicketState, FormData>(
    createTicket,
    undefined,
  );
  const [serviceId, setServiceId] = useState<string>("");
  const [other, setOther] = useState(false);
  const [advance, setAdvance] = useState<number>(0);

  const selected = services.find((s) => s.id === serviceId);
  const total = other
    ? 0
    : selected
      ? selected.price
      : 0;

  return (
    <form action={action} className="card space-y-6">
      <div>
        <label className="lbl" htmlFor="patient_name">
          Nom et prénom
        </label>
        <input
          id="patient_name"
          name="patient_name"
          required
          className="input"
        />
        {state?.errors?.patient_name && (
          <p className="text-[#DC2626] text-sm mt-2">{state.errors.patient_name}</p>
        )}
      </div>

      <div>
        <label className="lbl" htmlFor="service_id">
          Service
        </label>
        <select
          id="service_id"
          name="service_id"
          value={other ? "" : serviceId}
          onChange={(e) => {
            if (e.target.value === "__other__") {
              setOther(true);
              setServiceId("");
            } else {
              setOther(false);
              setServiceId(e.target.value);
            }
          }}
          className="input"
        >
          <option value="">— Choisir —</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {formatCfa(s.price)}
            </option>
          ))}
          <option value="__other__">Autre service</option>
        </select>
        {other && <input type="hidden" name="service_id" value="" />}
      </div>

      {other && (
        <div className="space-y-3">
          <div>
            <label className="lbl" htmlFor="other_label">
              Libellé du service
            </label>
            <input
              id="other_label"
              name="other_label"
              required
              className="input"
            />
          </div>
          <div>
            <label className="lbl" htmlFor="other_price">
              Prix (F CFA)
            </label>
            <input
              id="other_price"
              name="other_price"
              type="number"
              min={0}
              step={1}
              required
              className="input"
            />
          </div>
        </div>
      )}

      <div>
        <label className="lbl" htmlFor="total">
          Montant total (F CFA)
        </label>
        <input
          id="total"
          name={isAdmin ? "total_override" : undefined}
          type="number"
          min={0}
          step={1}
          defaultValue={total || undefined}
          key={total}
          readOnly={!isAdmin}
          className="input"
          style={isAdmin ? { background: "#F0F7F5" } : undefined}
        />
        {!isAdmin && (
          <p className="text-xs text-[#4B5F6B] mt-2">
            Calculé automatiquement. Seul l&apos;administrateur peut le modifier.
          </p>
        )}
      </div>

      <div>
        <label className="lbl" htmlFor="advance">
          Avance (F CFA)
        </label>
        <input
          id="advance"
          name="advance"
          type="number"
          min={0}
          step={1}
          value={advance}
          onChange={(e) => setAdvance(Number(e.target.value) || 0)}
          className="input"
        />
        {state?.errors?.advance && (
          <p className="text-[#DC2626] text-sm mt-2">{state.errors.advance}</p>
        )}
      </div>

      <div className="text-sm text-[#4B5F6B]">
        Reste :{" "}
        <span className="font-semibold text-[#0B1F2A]">
          {formatCfa(Math.max(0, total - advance))}
        </span>
      </div>

      <input type="hidden" name="quantity" value={1} />

      {state?.message && !state.ticketId && (
        <p className="text-[#DC2626] text-sm">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full"
      >
        {pending ? "Enregistrement…" : "Imprimer le ticket"}
      </button>
    </form>
  );
}
