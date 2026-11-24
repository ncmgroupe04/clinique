"use client";

import { useActionState, useState } from "react";
import { createTicket, type CreateTicketState } from "@/app/actions/tickets";
import { formatCfa, formatDateTime } from "@/lib/format";

type Service = { id: string; name: string; price: number };

type Structure = {
  name: string;
  address?: string | null;
  phone?: string | null;
  header_text?: string | null;
};

export default function NouveauTicketForm({
  services,
  isAdmin,
  structure,
}: {
  services: Service[];
  isAdmin: boolean;
  structure: Structure | null;
}) {
  const [state, action, pending] = useActionState<CreateTicketState, FormData>(createTicket, undefined);
  const [patientName, setPatientName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [other, setOther] = useState(false);
  const [otherLabel, setOtherLabel] = useState("");
  const [otherPrice, setOtherPrice] = useState("");
  const [advance, setAdvance] = useState<number>(0);
  const [totalOverride, setTotalOverride] = useState<number | null>(null);

  const selected = services.find((s) => s.id === serviceId);
  const unitPrice = other ? Number(otherPrice) || 0 : selected?.price ?? 0;
  const total = isAdmin && totalOverride !== null ? totalOverride : unitPrice;
  const reste = Math.max(0, total - advance);

  const previewDate = new Date();
  const previewDateTime = formatDateTime(previewDate.toISOString());
  const previewNumber = String(1).padStart(3, "0");
  const serviceLabel = other ? otherLabel.trim() || "Autre service" : selected?.name ?? "—";

  return (
    <form
      action={action}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:gap-8 items-start"
    >
      <section className="card space-y-6">
        <div>
          <label className="lbl" htmlFor="patient_name">
            Nom et prénom
          </label>
          <input
            id="patient_name"
            name="patient_name"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
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
                setTotalOverride(null);
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
          {other && (
            <>
              <label className="lbl" htmlFor="other_label">
                Libellé du service
              </label>
              <input
                id="other_label"
                name="other_label"
                required
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                className="input"
              />
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
                value={otherPrice}
                onChange={(e) => setOtherPrice(e.target.value)}
                className="input"
              />
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="lbl" htmlFor="total">
              Montant total (selon le service)
            </label>
            <input
              id="total"
              name={isAdmin ? "total_override" : undefined}
              type="number"
              min={0}
              step={1}
              readOnly={!isAdmin}
              value={isAdmin ? totalOverride ?? unitPrice : unitPrice}
              onChange={
                isAdmin
                  ? (e) => setTotalOverride(Number(e.target.value) || 0)
                  : undefined
              }
              className="input"
              style={isAdmin ? { background: "#F0F7F5" } : undefined}
            />
          </div>
          <div>
            <label className="lbl" htmlFor="advance">
              Avance
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
          </div>
          <div>
            <label className="lbl" htmlFor="reste">
              Reste (automatique)
            </label>
            <input
              id="reste"
              readOnly
              value={reste}
              className="input"
              style={{ borderColor: "#2B8A6E", background: "#EBF6F2", color: "#0B6B4F", fontWeight: 700 }}
            />
          </div>
        </div>

        <div>
          <label className="lbl" htmlFor="date">
            Date prise sur l&apos;ordinateur
          </label>
          <input id="date" readOnly value={previewDateTime} className="input" />
        </div>

        <input type="hidden" name="quantity" value={1} />

        {state?.message && !state.ticketId && (
          <p className="text-[#DC2626] text-sm">{state.message}</p>
        )}
      </section>

      <section className="card space-y-6">
        <div>
          <span className="inline-flex items-center rounded-full bg-[#EBF0EE] px-4 py-2 text-[13px] font-medium text-[#122429]">
            {previewDateTime}
          </span>
        </div>

        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6A7A80]">
            Aperçu du ticket thermique
          </p>
          <div className="mt-3 rounded-[24px] border border-[#E2E8E6] bg-[#FAFBFB] p-5">
            <div className="text-center font-bold text-[#0F1F23]" style={{ fontSize: 18 }}>
              {structure?.name}
            </div>
            {structure?.address && (
              <div className="text-center text-xs text-[#6A7A80]">{structure.address}</div>
            )}
            {structure?.phone && (
              <div className="text-center text-xs text-[#6A7A80]">Tél. {structure.phone}</div>
            )}
            <div className="border-t border-dashed border-[#C7D2CF] my-2" />
            <div className="text-center font-bold" style={{ fontSize: 20, color: "#0B6B4F" }}>
              N° {previewNumber}
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#4B5F6B]">Nom</span>
                <span className="font-medium text-[#0B1F2A]">{patientName || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#4B5F6B]">Service</span>
                <span className="font-medium text-[#0B1F2A]">{serviceLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#4B5F6B]">Total</span>
                <span className="font-medium text-[#0B1F2A]">{total.toLocaleString("fr-FR")} F</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#4B5F6B]">Avance</span>
                <span className="font-medium text-[#0B1F2A]">{advance.toLocaleString("fr-FR")} F</span>
              </div>
              <div className="flex justify-between text-sm font-bold uppercase">
                <span style={{ color: "#0B6B4F" }}>Reste</span>
                <span style={{ color: "#0B6B4F", fontWeight: 700 }}>
                  {reste.toLocaleString("fr-FR")} F
                </span>
              </div>
            </div>
            <div className="border-t border-dashed border-[#C7D2CF] my-2" />
            <div className="text-center text-xs text-[#6A7A80]">{previewDateTime}</div>
            <div className="text-center text-xs text-[#6A7A80] mt-1">Merci de votre visite</div>
          </div>

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Enregistrement…" : "Imprimer le ticket"}
          </button>
        </div>
      </section>
    </form>
  );
}
