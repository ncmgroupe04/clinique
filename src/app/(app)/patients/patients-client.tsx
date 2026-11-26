"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCfa } from "@/lib/format";

export type DocType = "ticket" | "facture" | "ordonnance";

export type PatientDocument = {
  id: string;
  type: DocType;
  reference: string;
  date: string;
  amount: number;
  remaining: number;
  status: string;
  info: string | null;
};

export type PatientRow = {
  key: string;
  name: string;
  ticketCount: number;
  invoiceCount: number;
  prescriptionCount: number;
  lastDate: string;
  totalBilled: number;
  totalRemaining: number;
  phone: string | null;
  age: string | null;
  notes: string | null;
  hasFiche: boolean;
  documents: PatientDocument[];
};

const TABS: { value: DocType | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "ticket", label: "Tickets" },
  { value: "facture", label: "Factures" },
  { value: "ordonnance", label: "Ordonnances" },
];

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count > 1 ? "s" : ""}`;
}

export default function PatientsClient({ patients }: { patients: PatientRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<DocType | "tous">("tous");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [newPatient, setNewPatient] = useState({ full_name: "", phone: "", patient_age: "", notes: "" });

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return patients;
    return patients.filter((patient) => normalize(patient.name).includes(q));
  }, [patients, query]);

  const selected = filtered.find((patient) => patient.key === selectedKey) ?? null;
  const documents = selected
    ? selected.documents.filter((doc) => tab === "tous" || doc.type === tab)
    : [];

  function select(key: string) {
    setSelectedKey(key);
    setTab("tous");
  }

  function countFor(type: DocType | "tous"): number {
    if (!selected) return 0;
    if (type === "tous") return selected.documents.length;
    return selected.documents.filter((doc) => doc.type === type).length;
  }

  async function submitPatient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError("");
    if (!newPatient.full_name.trim()) {
      setAddError("Le nom du patient est requis.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPatient),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Ajout impossible.");
      setNewPatient({ full_name: "", phone: "", patient_age: "", notes: "" });
      setShowAdd(false);
      setQuery(newPatient.full_name.trim());
      router.refresh();
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Ajout impossible.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="lbl" htmlFor="patient-search" style={{ marginBottom: 0 }}>Rechercher un patient</label>
          <button
            type="button"
            onClick={() => { setShowAdd((v) => !v); setAddError(""); }}
            className="go"
            style={{ height: 38, width: "auto", padding: "0 14px", fontSize: 13, borderRadius: 12 }}
          >
            {showAdd ? "Fermer" : "+ Ajouter patient"}
          </button>
        </div>

        {showAdd ? (
          <form onSubmit={submitPatient} className="mt-4 grid gap-3 rounded-[14px] border border-[#E2EAEF] bg-[#F7FAFB] p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="lbl" htmlFor="new-patient-name">Nom et prénom *</label>
              <input id="new-patient-name" className="in" value={newPatient.full_name} maxLength={200}
                onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })} placeholder="Nom et prénom" required />
            </div>
            <div>
              <label className="lbl" htmlFor="new-patient-phone">Téléphone</label>
              <input id="new-patient-phone" className="in" value={newPatient.phone} maxLength={40}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} placeholder="77 123 45 67" />
            </div>
            <div>
              <label className="lbl" htmlFor="new-patient-age">Âge</label>
              <input id="new-patient-age" className="in" value={newPatient.patient_age} maxLength={40}
                onChange={(e) => setNewPatient({ ...newPatient, patient_age: e.target.value })} placeholder="34 ans" />
            </div>
            <div className="sm:col-span-2">
              <label className="lbl" htmlFor="new-patient-notes">Notes</label>
              <input id="new-patient-notes" className="in" value={newPatient.notes} maxLength={1000}
                onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })} placeholder="Information utile…" />
            </div>
            {addError ? <p className="sm:col-span-2 text-sm font-semibold text-danger">{addError}</p> : null}
            <div className="sm:col-span-2">
              <button type="submit" disabled={adding} className="go" style={{ height: 44, fontSize: 14, opacity: adding ? 0.6 : 1 }}>
                {adding ? "Enregistrement…" : "Enregistrer le patient"}
              </button>
            </div>
          </form>
        ) : null}

        <input
          id="patient-search"
          className="in mt-3"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tapez le nom du patient…"
          autoComplete="off"
        />
        <p className="mt-3 text-xs font-medium text-muted">
          {plural(filtered.length, "patient")} · fiches et dossiers reconstitués à partir des tickets, factures et ordonnances.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="card">
          <h2 className="mb-3 text-lg font-extrabold text-ink">Patients</h2>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted">Aucun patient ne correspond à cette recherche.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((patient) => (
                <li key={patient.key}>
                  <button
                    type="button"
                    onClick={() => select(patient.key)}
                    aria-pressed={selectedKey === patient.key}
                    className="flex w-full items-start gap-3 rounded-[14px] px-2 py-3 text-left transition-colors hover:bg-[#F7FAFB]"
                    style={selectedKey === patient.key ? { background: "#DFF3EF" } : undefined}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">{patient.name}</span>
                      <span className="mt-1 block text-xs text-muted">
                        Dernière activité : {formatDate(patient.lastDate)}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-[#F2F5F7] px-2.5 py-1 text-[11px] font-bold text-muted">
                          {plural(patient.ticketCount, "ticket")}
                        </span>
                        <span className="rounded-full bg-[#F2F5F7] px-2.5 py-1 text-[11px] font-bold text-muted">
                          {plural(patient.invoiceCount, "facture")}
                        </span>
                        <span className="rounded-full bg-[#F2F5F7] px-2.5 py-1 text-[11px] font-bold text-muted">
                          {plural(patient.prescriptionCount, "ordonnance")}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[13px] font-extrabold text-ink">
                        {formatCfa(patient.totalBilled)}
                      </span>
                      {patient.totalRemaining > 0 ? (
                        <span className="mt-1 block text-[11px] font-bold text-danger">
                          Reste {formatCfa(patient.totalRemaining)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          {!selected ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <p className="text-sm font-bold text-muted">Aucun dossier sélectionné</p>
              <p className="mt-1 text-xs text-muted">
                Cliquez sur un patient pour afficher ses tickets, factures et ordonnances.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-extrabold text-ink">{selected.name}</h2>
                  <p className="mt-1 text-xs text-muted">
                    Dossier patient · dernière activité le {formatDate(selected.lastDate)}
                  </p>
                  {selected.hasFiche ? (
                    <span className="mt-2 inline-block rounded-full bg-[#DFF3EF] px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-[#0B5F54]">
                      FICHE PATIENT
                    </span>
                  ) : null}
                  {selected.phone || selected.age || selected.notes ? (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      {selected.phone ? <span>Tél. {selected.phone}</span> : null}
                      {selected.age ? <span>Âge : {selected.age}</span> : null}
                      {selected.notes ? <span className="break-words">{selected.notes}</span> : null}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  className="btn-secondary shrink-0"
                  style={{ height: 36, padding: "0 14px", borderRadius: 12, fontSize: 12 }}
                >
                  Fermer
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: "Tickets", value: String(selected.ticketCount) },
                  { label: "Factures", value: String(selected.invoiceCount) },
                  { label: "Ordonnances", value: String(selected.prescriptionCount) },
                  { label: "Total facturé", value: formatCfa(selected.totalBilled) },
                  { label: "Reste dû", value: formatCfa(selected.totalRemaining) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[14px] bg-[#F7FAFB] px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-muted">{stat.label}</p>
                    <p className="mt-1 break-words text-[13px] font-extrabold text-ink">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                {TABS.map((item) => {
                  const active = tab === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setTab(item.value)}
                      aria-pressed={active}
                      className={active ? "go" : "btn-secondary"}
                      style={{ height: 38, padding: "0 14px", borderRadius: 12, fontSize: 12 }}
                    >
                      {item.label} ({countFor(item.value)})
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted">Aucun document dans cette catégorie.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {documents.map((doc) => (
                      <li key={`${doc.type}-${doc.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="font-bold text-ink">{doc.reference}</p>
                          <p className="text-xs text-muted">
                            {formatDate(doc.date)}
                            {doc.info ? ` · ${doc.info}` : ""}
                            {doc.status === "annule" ? " · Annulé" : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[13px] font-bold text-ink">
                            {doc.type === "ordonnance" ? "—" : formatCfa(doc.amount)}
                          </p>
                          {doc.remaining > 0 ? (
                            <p className="mt-0.5 text-[11px] font-bold text-danger">
                              Reste {formatCfa(doc.remaining)}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
