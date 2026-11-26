"use client";

import { useActionState, useState } from "react";
import { createSupportTicket, replySupportTicket } from "@/app/actions/platform";

type Ticket = { id: string; subject: string; message: string; status: string; priority: string; created_at: string };
type Msg = { id: string; ticket_id: string; body: string; created_at: string };

export default function SupportStructureClient({ tickets, messages }: { tickets: Ticket[]; messages: Msg[] }) {
  const [createState, createAction, createPending] = useActionState(createSupportTicket, undefined);
  const [replyState, replyAction, replyPending] = useActionState(replySupportTicket, undefined);
  const [activeId, setActiveId] = useState<string | null>(tickets[0]?.id ?? null);
  const [showForm, setShowForm] = useState(tickets.length === 0);

  const active = tickets.find((t) => t.id === activeId) ?? null;
  const thread = messages.filter((m) => m.ticket_id === activeId);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      <section className="card space-y-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Mes demandes</h2>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary"
            style={{ height: 34, padding: "0 12px", borderRadius: 10, fontSize: 12, width: "auto" }}
          >
            {showForm ? "Fermer" : "+ Nouvelle"}
          </button>
        </div>

        {showForm && (
          <form action={createAction} className="space-y-2 rounded-xl bg-bg p-3">
            <input name="subject" placeholder="Sujet" required className="input" style={{ height: 40, fontSize: 13 }} />
            <textarea name="message" placeholder="Décrivez votre problème…" required rows={3} className="in" style={{ height: "auto", paddingTop: 10, paddingBottom: 10, fontSize: 13 }} />
            <select name="priority" className="input" style={{ height: 40, fontSize: 13 }} defaultValue="normal">
              <option value="faible">Faible</option>
              <option value="normal">Normale</option>
              <option value="urgent">Urgente</option>
            </select>
            {createState?.message && <p className="text-xs text-danger">{createState.message}</p>}
            {createState?.success && <p className="text-xs text-accent">Demande envoyée.</p>}
            <button type="submit" disabled={createPending} className="btn-primary" style={{ height: 38, width: "100%", borderRadius: 10, fontSize: 13 }}>
              {createPending ? "Envoi…" : "Envoyer"}
            </button>
          </form>
        )}

        {tickets.length === 0 && !showForm && <p className="text-sm text-muted">Aucune demande.</p>}
        {tickets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={`w-full rounded-xl p-3 text-left transition-colors ${activeId === t.id ? "bg-accent-light" : "hover:bg-bg"}`}
          >
            <p className="truncate text-sm font-bold text-ink">{t.subject}</p>
            <p className="text-[11px] text-muted">{t.status} · {new Date(t.created_at).toLocaleDateString("fr-FR")}</p>
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
              <p className="text-xs text-muted">{active.priority} · {new Date(active.created_at).toLocaleString("fr-FR")}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{active.message}</p>
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              {thread.map((m) => (
                <div key={m.id} className="rounded-xl bg-bg p-3 text-sm">
                  <p className="text-[11px] text-muted">{new Date(m.created_at).toLocaleString("fr-FR")}</p>
                  <p className="mt-1">{m.body}</p>
                </div>
              ))}
              {!thread.length && <p className="text-xs text-muted">Pas encore de réponse.</p>}
            </div>
            <form action={replyAction} className="space-y-2">
              <input type="hidden" name="ticket_id" value={active.id} />
              <textarea name="body" required rows={2} placeholder="Ajouter un précision…" className="in" style={{ height: "auto", paddingTop: 10, paddingBottom: 10 }} />
              {replyState?.message && <p className="text-xs text-danger">{replyState.message}</p>}
              <button type="submit" disabled={replyPending} className="btn-secondary" style={{ height: 38, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto" }}>
                {replyPending ? "Envoi…" : "Répondre"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
