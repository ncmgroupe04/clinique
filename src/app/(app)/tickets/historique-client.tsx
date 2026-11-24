"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { cancelTicketAction, restoreTicket } from "@/app/actions/tickets";
import { formatCfa, formatReceipt, formatDateTime } from "@/lib/format";

type Ticket = {
  id: string;
  year: number;
  number: number;
  patient_name: string;
  service_name: string;
  total: number;
  advance: number;
  remaining: number;
  status: string;
  cancel_reason: string | null;
  created_at: string;
  print_count: number;
};

export default function HistoriqueClient({ tickets }: { tickets: Ticket[] }) {
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [state, action, pending] = useActionState(cancelTicketAction, undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setCancelingId(null);
  }, [state]);

  return (
    <div className="card">
      {tickets.length === 0 ? (
        <p className="text-[#4B5F6B] text-sm text-center py-6">
          Aucun ticket pour ces critères.
        </p>
      ) : (
        <ul className="divide-y divide-[#E2EAEF]">
          {tickets.map((t) => (
            <li key={t.id} className="py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0B1F2A]">
                    {formatReceipt(t.year, t.number)} — {t.patient_name}
                  </p>
                  <p className="text-xs text-[#4B5F6B]">
                    {t.service_name} · {formatDateTime(t.created_at)} ·{" "}
                    {t.status === "annule" ? (
                      <span className="text-[#DC2626]">Annulé</span>
                    ) : (
                      <span className="text-[#0B7A6B]">Valide</span>
                    )}
                  </p>
                  <p className="text-xs text-[#4B5F6B]">
                    Total {formatCfa(t.total)} · Avance {formatCfa(t.advance)} · Reste{" "}
                    {formatCfa(t.remaining)}
                  </p>
                  {t.cancel_reason && (
                    <p className="text-xs text-[#DC2626] italic">
                      Motif : {t.cancel_reason}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <Link
                    href={`/tickets/${t.id}`}
                    className="text-sm text-[#0B7A6B] font-medium"
                  >
                    Voir le reçu
                  </Link>
                  {t.status === "actif" && (
                    <button
                      type="button"
                      onClick={() => setCancelingId(t.id)}
                      className="text-sm font-semibold text-[#DC2626] cursor-pointer"
                    >
                      Annuler le ticket
                    </button>
                  )}
                  {t.status === "annule" && (
                    <form action={restoreTicket}>
                      <input type="hidden" name="ticket_id" value={t.id} />
                      <button
                        type="submit"
                        className="text-sm font-semibold text-[#0B7A6B] cursor-pointer"
                      >
                        Rétablir
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {cancelingId === t.id && (
                <form action={action} className="flex gap-2 items-start">
                  <input type="hidden" name="ticket_id" value={t.id} />
                  <input
                    name="reason"
                    placeholder="Motif d'annulation"
                    required
                    className="flex-1 input"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-danger-solid"
                    style={{ height: 48, padding: "0 24px", borderRadius: 14, fontSize: 15 }}
                  >
                    {pending ? "…" : "Annuler le ticket"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelingId(null)}
                    className="btn-secondary"
                  >
                    Retour
                  </button>
                </form>
              )}
              {state?.message && cancelingId === null && (
                <p
                  className={
                    state.success
                      ? "text-[#0B7A6B] text-xs"
                      : "text-[#DC2626] text-xs"
                  }
                >
                  {state.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

