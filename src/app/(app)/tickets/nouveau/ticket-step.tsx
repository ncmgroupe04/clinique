"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createTicket, type CreateTicketState } from "@/app/actions/tickets";

type ChosenService = {
  id: string | null;
  label: string;
  price: number;
  other: boolean;
};

type Structure = {
  name: string;
  address?: string | null;
  phone?: string | null;
  header_text?: string | null;
  paper_width_mm?: number | null;
};

function fcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} F`;
}

export default function TicketStep({
  service,
  isAdmin,
  structure,
  nextReceipt,
  now,
}: {
  service: ChosenService;
  isAdmin: boolean;
  structure: Structure | null;
  nextReceipt: { year: number; number: number };
  now: string;
}) {
  const [state, action, pending] = useActionState<CreateTicketState, FormData>(createTicket, undefined);
  const [patientName, setPatientName] = useState("");
  const [advance, setAdvance] = useState<number>(0);
  const [totalOverride, setTotalOverride] = useState<number | null>(null);

  const unitPrice = service.price;
  const total = isAdmin && totalOverride !== null ? totalOverride : unitPrice;
  const reste = Math.max(0, total - advance);
  const paperWidth = structure?.paper_width_mm === 58 ? 58 : 80;

  return (
    <form action={action} className="flex flex-1 flex-col items-stretch gap-7 lg:flex-row">
      <section className="card flex w-full min-w-0 flex-1 flex-col gap-6">
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
            className="in in-lg"
          />
          {state?.errors?.patient_name && (
            <p className="mt-2 text-sm text-danger">{state.errors.patient_name}</p>
          )}
        </div>

        <div>
          <span className="lbl">Service choisi</span>
          <div className="flex h-[60px] items-center justify-between gap-3 rounded-[14px] border-[1.5px] border-accent bg-accent-light px-[18px]">
            <div className="min-w-0 truncate">
              <b className="text-lg">{service.label}</b>{" "}
              <span className="text-[15px] font-semibold text-accent-text">
                · {fcfa(service.price)}
              </span>
            </div>
            <Link
              href="/tickets/nouveau"
              className="x"
              style={{
                width: "auto",
                height: 40,
                padding: "0 16px",
                background: "#fff",
                color: "#0B5F54",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              Changer
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
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
                isAdmin ? (e) => setTotalOverride(Number(e.target.value) || 0) : undefined
              }
              className="in in-xl"
            />
          </div>
          <div className="flex-1">
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
              className="in in-xl"
            />
          </div>
          <div className="flex-1">
            <label className="lbl" htmlFor="reste">
              Reste (automatique)
            </label>
            <input
              id="reste"
              readOnly
              value={reste}
              className="in in-xl"
              style={{
                background: "#DFF3EF",
                borderColor: "#0B7A6B",
                color: "#0B5F54",
                fontWeight: 800,
              }}
            />
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-[18px]">
          <span className="text-[15px] font-semibold text-muted">
            Date prise sur l’ordinateur
          </span>
          <span className="rounded-full bg-[#F2F5F7] px-[18px] py-2.5 text-[15px] font-bold">
            {now}
          </span>
        </div>

        <input type="hidden" name="quantity" value={1} />
        {service.other ? (
          <>
            <input type="hidden" name="service_id" value="" />
            <input type="hidden" name="other_label" value={service.label} />
            <input type="hidden" name="other_price" value={service.price} />
          </>
        ) : (
          <input type="hidden" name="service_id" value={service.id ?? ""} />
        )}

        {state?.message && !state.ticketId && (
          <p className="text-sm text-danger">{state.message}</p>
        )}
      </section>

      <aside className="flex w-full flex-col gap-[18px] lg:w-[380px] lg:shrink-0">
        <section className="card flex flex-1 flex-col items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-[1px] text-muted">
            Aperçu · Papier {paperWidth} mm
          </div>

          <div
            className="flex max-w-full flex-col gap-2.5 border border-border bg-[#FAFAF7] px-[18px] py-5 text-center text-[13px]"
            style={{ width: paperWidth === 58 ? 230 : 290, fontFamily: "ui-monospace, Menlo, monospace" }}
          >
            <div className="text-sm font-extrabold">{structure?.name ?? "—"}</div>
            {(structure?.address || structure?.phone) && (
              <div className="text-[11px] text-muted">
                {[structure.address, structure.phone && `Tél. ${structure.phone}`]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}

            <div className="border-t-2 border-dashed border-[#B9C7CF]" />

            <div className="text-[26px] font-extrabold text-accent">
              Reçu {nextReceipt.year}-{String(nextReceipt.number).padStart(3, "0")}
            </div>

            <div className="row" style={{ fontSize: 13 }}>
              <span>Nom</span>
              <span style={{ color: "#0B1F2A", fontWeight: 600 }}>{patientName || "—"}</span>
            </div>
            <div className="row" style={{ fontSize: 13 }}>
              <span>Service</span>
              <span style={{ color: "#0B1F2A", fontWeight: 600 }}>{service.label}</span>
            </div>
            <div className="row" style={{ fontSize: 13 }}>
              <span>Total</span>
              <span style={{ color: "#0B1F2A", fontWeight: 600 }}>{fcfa(total)}</span>
            </div>
            <div className="row" style={{ fontSize: 13 }}>
              <span>Avance</span>
              <span style={{ color: "#0B1F2A", fontWeight: 600 }}>{fcfa(advance)}</span>
            </div>
            <div className="row" style={{ fontSize: 15, fontWeight: 800 }}>
              <span style={{ color: "#0B1F2A", fontWeight: 800 }}>RESTE</span>
              <span style={{ color: "#0B1F2A", fontWeight: 800 }}>{fcfa(reste)}</span>
            </div>

            <div className="border-t-2 border-dashed border-[#B9C7CF]" />

            <div>{now}</div>
            <div className="text-xs text-muted">Merci de votre visite</div>
          </div>
        </section>

        <button type="submit" disabled={pending} className="go">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" />
            <rect x="7" y="14" width="10" height="7" />
          </svg>
          {pending ? "Enregistrement…" : "Imprimer le ticket"}
        </button>
      </aside>
    </form>
  );
}
