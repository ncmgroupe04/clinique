"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { validateRegistration, rejectRegistration } from "@/app/actions/admin";
import Pagination from "../../pagination";
import ConfirmActionButton from "../../confirm-action-button";

function ActionButton({ label, variant }: { label: string; variant: "primary" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={variant === "primary" ? "go" : "btn-danger-solid"}
      style={{ height: 34, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto" }}
    >
      {pending ? "…" : label}
    </button>
  );
}

type Inscription = {
  id: string;
  name: string;
  created_at: string;
  active: boolean;
  suspended: boolean;
  registration_fee_paid: boolean;
  subscription_ends_at: string | null;
  email: string;
  address?: string | null;
  phone?: string | null;
  headerText?: string | null;
};

const TABS = [
  { value: "pending", label: "En attente" },
  { value: "validated", label: "Validées" },
  { value: "invalid", label: "Invalides" },
];

export default function InscriptionsClient({ structures }: { structures: Inscription[] }) {
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Inscription | null>(null);
  const PAGE_SIZE = 10;

  const pending = structures.filter((s) => !s.registration_fee_paid && !s.suspended);
  const validated = structures.filter((s) => s.registration_fee_paid && s.active && !s.suspended);
  const invalid = structures.filter((s) => s.suspended || (s.registration_fee_paid && !s.active));

  const list = tab === "pending" ? pending : tab === "validated" ? validated : invalid;
  const start = (page - 1) * PAGE_SIZE;
  const visible = list.slice(start, start + PAGE_SIZE);

  const switchTab = (t: string) => {
    setTab(t);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {TABS.map((t) => {
          const count = t.value === "pending" ? pending.length : t.value === "validated" ? validated.length : invalid.length;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => switchTab(t.value)}
              className={tab === t.value ? "go" : "btn-secondary"}
              style={{ height: 40, padding: "0 18px", borderRadius: 14, fontSize: 13, width: "auto" }}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      <section className="card">
        {visible.length === 0 ? (
          <p className="text-sm text-muted">Aucune demande dans cette catégorie.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold text-ink">{s.name}</p>
                  <p className="text-xs text-muted">
                    Inscrite le {new Date(s.created_at).toLocaleDateString("fr-FR")}
                    {tab !== "pending" && ` · ${s.active && !s.suspended ? "Active" : "Inactive"}`}
                    {s.subscription_ends_at && ` · échéance ${new Date(s.subscription_ends_at).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                {tab === "pending" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetail(s)}
                      className="btn-secondary text-xs"
                      style={{ height: 34, padding: "0 12px", borderRadius: 10 }}
                    >
                      Détail
                    </button>
                    {tab === "pending" && (
                      <>
                        <ConfirmActionButton
                          label="Valider le paiement"
                          confirmTitle="Valider le paiement ?"
                          confirmMessage={`La structure « ${s.name} » sera activée et pourra utiliser la plateforme.`}
                          confirmLabel="Confirmer la validation"
                          confirmClassName="btn-primary"
                          formAction={validateRegistration}
                          hiddenInputs={[{ name: "id", value: s.id }]}
                          buttonClassName="go"
                          buttonStyle={{ height: 34, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto" }}
                        />
                        <form action={rejectRegistration}>
                          <input type="hidden" name="id" value={s.id} />
                          <ActionButton label="Rejeter" variant="danger" />
                        </form>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pagination total={list.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </section>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(11, 31, 42, 0.55)" }}
          onClick={() => setDetail(null)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-ink">Détail de la demande</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="row"><span>Structure</span><span className="font-bold">{detail.name}</span></div>
              <div className="row"><span>E-mail</span><span className="font-medium">{detail.email || "—"}</span></div>
              <div className="row"><span>Téléphone</span><span className="font-medium">{detail.phone || "—"}</span></div>
              <div className="row"><span>Adresse</span><span className="font-medium">{detail.address || "—"}</span></div>
              <div className="row"><span>Autres informations</span><span className="font-medium">{detail.headerText || "—"}</span></div>
              <div className="row"><span>Date</span><span className="font-medium">{new Date(detail.created_at).toLocaleDateString("fr-FR")}</span></div>
              <div className="row"><span>Paiement</span><span className={detail.registration_fee_paid ? "text-accent font-bold" : "text-danger font-bold"}>{detail.registration_fee_paid ? "Payé" : "Non payé"}</span></div>
              <div className="row"><span>Statut</span><span className="font-medium">{detail.active && !detail.suspended ? "Actif" : "Inactif"}</span></div>
              <div className="row"><span>Échéance</span><span className="font-medium">{detail.subscription_ends_at ? new Date(detail.subscription_ends_at).toLocaleDateString("fr-FR") : "—"}</span></div>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setDetail(null)} className="btn-secondary" style={{ height: 40, padding: "0 18px", borderRadius: 12, fontSize: 13 }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
