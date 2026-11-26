"use client";

import { useActionState, useState } from "react";
import { replySupportTicket, updateSupportStatus } from "@/app/actions/platform";
type TicketRow = {
  id: string;
  structure_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  structure_name: string;
};

type Msg = { id: string; ticket_id: string; body: string; created_at: string };

export default function SupportClient({ tickets, messages }: { tickets: TicketRow[]; messages: Msg[] }) {
  const [activeId, setActiveId] = useState<string | null>(tickets[0]?.id ?? null);
  const [state, replyAction, pending] = useActionState(replySupportTicket, undefined);
  const active = tickets.find((t) => t.id === activeId) ?? null;
  const thread = messages.filter((m) => m.ticket_id === activeId);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      <section className="card space-y-1">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Demandes</h2>
        {tickets.length === 0 && <p className="text-sm text-muted">Aucune demande.</p>}
        {tickets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={`w-full rounded-xl p-3 text-left transition-colors ${activeId === t.id ? "bg-accent-light" : "hover:bg-bg"}`}
          >
            <p className="truncate text-sm font-bold text-ink">{t.subject}</p>
            <p className="text-[11px] text-muted">{t.structure_name} · {t.status}</p>
          </button>
        ))}
      </section>

      <section className="card flex flex-col gap-4">
        {!active ? (
          <p className="text-sm text-muted">Sélectionnez une demande.</p>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-extrabold text-ink">{active.subject}</h2>
              <p className="text-xs text-muted">{active.structure_name} · {active.priority} · {new Date(active.created_at).toLocaleString("fr-FR")}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{active.message}</p>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              {thread.map((m) => (
                <div key={m.id} className="rounded-xl bg-bg p-3 text-sm">
                  <p className="text-[11px] text-muted">{new Date(m.created_at).toLocaleString("fr-FR")}</p>
                  <p className="mt-1">{m.body}</p>
                </div>
              ))}
              {!thread.length && <p className="text-xs text-muted">Aucune réponse.</p>}
            </div>

            <form action={replyAction} className="space-y-2">
              <input type="hidden" name="ticket_id" value={active.id} />
              <textarea name="body" required rows={3} placeholder="Votre réponse…" className="in" style={{ height: "auto", paddingTop: 12, paddingBottom: 12 }} />
              {state?.message && <p className="text-sm text-danger">{state.message}</p>}
              <button type="submit" disabled={pending} className="btn-primary" style={{ height: 42, padding: "0 18px", borderRadius: 12, fontSize: 13, width: "auto" }}>
                {pending ? "Envoi…" : "Répondre"}
              </button>
            </form>

            <form action={updateSupportStatus} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <input type="hidden" name="id" value={active.id} />
              <select name="status" defaultValue={active.status} className="input" style={{ width: 160 }}>
                <option value="ouvert">Ouvert</option>
                <option value="en_cours">En cours</option>
                <option value="resolu">Résolu</option>
                <option value="ferme">Fermé</option>
              </select>
              <button type="submit" className="btn-secondary" style={{ height: 42, padding: "0 16px", borderRadius: 12, fontSize: 13, width: "auto" }}>Changer le statut</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
