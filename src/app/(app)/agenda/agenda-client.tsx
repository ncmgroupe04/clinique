"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

export type AppointmentStatus = "planifie" | "termine" | "annule";

export type Appointment = {
  id: string;
  patient_name: string;
  patient_age: string | null;
  appointment_date: string;
  appointment_time: string;
  doctor_id: string | null;
  motif: string | null;
  status: AppointmentStatus;
  cancel_reason: string | null;
  notes: string | null;
};

export type Doctor = { id: string; full_name: string | null };

export type AgendaState =
  | { ok?: boolean; message?: string; errors?: Record<string, string[]> }
  | undefined;

export type MutateAppointment = (
  state: AgendaState,
  formData: FormData,
) => Promise<AgendaState>;

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  planifie: "Planifié",
  termine: "Terminé",
  annule: "Annulé",
};

const emptyForm = (date: string) => ({
  patient_name: "",
  patient_age: "",
  appointment_date: date,
  appointment_time: "09:00",
  doctor_id: "",
  motif: "",
});

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatFr(iso: string): string {
  return fromIso(iso).toLocaleDateString("fr-FR");
}

function monthLabel(year: number, month: number): string {
  const label = new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function AgendaClient({
  appointments,
  doctors,
  mutate,
}: {
  appointments: Appointment[];
  doctors: Doctor[];
  mutate: MutateAppointment;
}) {
  const today = useMemo(() => toIso(new Date()), []);
  const [view, setView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyForm(today));
  const [state, formAction, pending] = useActionState<AgendaState, FormData>(mutate, undefined);
  const lastState = useRef(state);

  useEffect(() => {
    if (!state || state === lastState.current) return;
    lastState.current = state;
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(emptyForm(selectedDate));
      setCancelingId(null);
    }
  }, [state, selectedDate]);

  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const offset = (first.getDay() + 6) % 7; // lundi = 0
    const start = new Date(view.year, view.month, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return {
        iso: toIso(d),
        day: d.getDate(),
        current: d.getMonth() === view.month,
      };
    });
  }, [view.year, view.month]);

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const list = map.get(a.appointment_date) ?? [];
      list.push(a);
      map.set(a.appointment_date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    }
    return map;
  }, [appointments]);

  const dayAppointments = byDate.get(selectedDate) ?? [];

  function changeMonth(delta: number) {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }

  function selectDay(iso: string, current: boolean) {
    setSelectedDate(iso);
    setForm((prev) => ({ ...prev, appointment_date: iso }));
    if (!current) {
      const d = fromIso(iso);
      setView({ year: d.getFullYear(), month: d.getMonth() });
    }
  }

  function updateField(key: keyof ReturnType<typeof emptyForm>, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const doctorName = (id: string | null) =>
    id ? (doctors.find((d) => d.id === id)?.full_name ?? "Médecin inconnu") : "Non assigné";

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ---------------- Calendrier ---------------- */}
      <section className="card min-w-0 flex-1" style={{ padding: 22 }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">{monthLabel(view.year, view.month)}</h2>
            <p className="mt-0.5 text-[12px] font-medium text-muted">
              Cliquez sur un jour pour voir ses rendez-vous.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Mois précédent"
              className="btn-secondary"
              style={{ height: 40, padding: "0 14px", fontSize: 15 }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                setView({ year: d.getFullYear(), month: d.getMonth() });
                setSelectedDate(toIso(d));
                setForm((prev) => ({ ...prev, appointment_date: toIso(d) }));
              }}
              className="btn-secondary"
              style={{ height: 40, padding: "0 14px", fontSize: 13 }}
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Mois suivant"
              className="btn-secondary"
              style={{ height: 40, padding: "0 14px", fontSize: 15 }}
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="pb-2 text-center text-[11px] font-extrabold uppercase tracking-wide text-muted"
            >
              {w}
            </div>
          ))}
          {cells.map((cell) => {
            const count = byDate.get(cell.iso)?.length ?? 0;
            const selected = cell.iso === selectedDate;
            const isToday = cell.iso === today;
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => selectDay(cell.iso, cell.current)}
                aria-label={`${formatFr(cell.iso)}${count ? `, ${count} rendez-vous` : ""}`}
                aria-pressed={selected}
                className="flex h-[44px] flex-col items-center justify-center gap-0.5 rounded-[10px] border transition-colors"
                style={{
                  borderColor: selected ? "#0b7a6b" : "transparent",
                  background: selected ? "#dff3ef" : isToday ? "#f2f5f7" : "#fff",
                  opacity: cell.current ? 1 : 0.42,
                }}
              >
                <span
                  className="text-[14px] font-bold"
                  style={{ color: selected ? "#0b5f54" : "#0b1f2a" }}
                >
                  {cell.day}
                </span>
                {count > 0 ? (
                  <span
                    className="rounded-full px-1.5 text-[10px] font-extrabold"
                    style={{ background: "#0b7a6b", color: "#fff" }}
                  >
                    {count}
                  </span>
                ) : (
                  <span className="h-[12px]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-[#e2eaef] pt-3 text-[11px] font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#0b7a6b" }} />
            Planifié
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#2f7fb5" }} />
            Terminé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#b42318" }} />
            Annulé
          </span>
        </div>
      </section>

      <div className="flex w-full flex-col gap-6 lg:w-[420px] lg:shrink-0">
        {/* ---------------- Ajout ---------------- */}
        <section className="card" style={{ padding: 22 }}>
          <h2 className="mb-3 text-lg font-extrabold">Nouveau rendez-vous</h2>
          {state?.message ? (
            <p
              className="mb-3 rounded-[12px] px-3 py-2 text-[13px] font-semibold"
              style={{
                background: state.ok ? "#dff3ef" : "#fde8e8",
                color: state.ok ? "#0b5f54" : "#b42318",
              }}
            >
              {state.message}
            </p>
          ) : null}
          {state?.errors
            ? Object.values(state.errors).flat().map((error, i) => (
                <p key={i} className="mb-1 text-[12px] font-semibold text-danger">
                  {error}
                </p>
              ))
            : null}

          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="op" value="create" />
            <div>
              <label className="lbl" htmlFor="agenda-patient">Nom du patient</label>
              <input
                id="agenda-patient"
                name="patient_name"
                className="in"
                placeholder="Nom et prénom"
                maxLength={200}
                required
                value={form.patient_name}
                onChange={(e) => updateField("patient_name", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="lbl" htmlFor="agenda-age">Âge</label>
                <input
                  id="agenda-age"
                  name="patient_age"
                  className="in"
                  placeholder="34 ans"
                  maxLength={40}
                  value={form.patient_age}
                  onChange={(e) => updateField("patient_age", e.target.value)}
                />
              </div>
              <div>
                <label className="lbl" htmlFor="agenda-time">Heure</label>
                <input
                  id="agenda-time"
                  name="appointment_time"
                  type="time"
                  className="in"
                  required
                  value={form.appointment_time}
                  onChange={(e) => updateField("appointment_time", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="lbl" htmlFor="agenda-date">Date</label>
              <input
                id="agenda-date"
                name="appointment_date"
                type="date"
                className="in"
                required
                value={form.appointment_date}
                onChange={(e) => {
                  updateField("appointment_date", e.target.value);
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="lbl" htmlFor="agenda-doctor">Médecin</label>
              <select
                id="agenda-doctor"
                name="doctor_id"
                className="in"
                value={form.doctor_id}
                onChange={(e) => updateField("doctor_id", e.target.value)}
              >
                <option value="">Non assigné</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name ?? "Médecin"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="lbl" htmlFor="agenda-motif">Motif</label>
              <input
                id="agenda-motif"
                name="motif"
                className="in"
                placeholder="Consultation, contrôle…"
                maxLength={500}
                value={form.motif}
                onChange={(e) => updateField("motif", e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="go btn-primary"
              style={{ height: 52, borderRadius: 14, fontSize: 15 }}
            >
              {pending ? "Enregistrement…" : "Ajouter le rendez-vous"}
            </button>
          </form>
        </section>

        {/* ---------------- RDV du jour ---------------- */}
        <section className="card" style={{ padding: 22 }}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">Rendez-vous du {formatFr(selectedDate)}</h2>
            <span className="rounded-full bg-[#f2f5f7] px-2.5 py-1 text-[11px] font-bold text-muted">
              {dayAppointments.length}
            </span>
          </div>

          {dayAppointments.length === 0 ? (
            <p className="py-4 text-sm text-muted">Aucun rendez-vous ce jour-là.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {dayAppointments.map((a) => {
                const badgeColor =
                  a.status === "planifie"
                    ? { background: "#dff3ef", color: "#0b5f54" }
                    : a.status === "termine"
                      ? { background: "#e4f0fa", color: "#26699a" }
                      : { background: "#fde8e8", color: "#b42318" };
                return (
                  <div
                    key={a.id}
                    className="rounded-[14px] border border-[#e2eaef] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-extrabold">
                          {a.appointment_time.slice(0, 5)} · {a.patient_name}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] font-medium text-muted">
                          {doctorName(a.doctor_id)}
                          {a.patient_age ? ` · ${a.patient_age}` : ""}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold"
                        style={badgeColor}
                      >
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                    {a.motif ? (
                      <p className="mt-2 text-[12px] font-medium text-[#4b5f6b]">
                        Motif : {a.motif}
                      </p>
                    ) : null}
                    {a.status === "annule" && a.cancel_reason ? (
                      <p className="mt-1 text-[12px] font-semibold text-danger">
                        Annulé : {a.cancel_reason}
                      </p>
                    ) : null}

                    {a.status === "planifie" ? (
                      cancelingId === a.id ? (
                        <form action={formAction} className="mt-3 flex flex-col gap-2">
                          <input type="hidden" name="op" value="annule" />
                          <input type="hidden" name="id" value={a.id} />
                          <label className="lbl" htmlFor={`cancel-${a.id}`}>
                            Motif d&apos;annulation
                          </label>
                          <input
                            id={`cancel-${a.id}`}
                            name="cancel_reason"
                            className="in"
                            style={{ height: 44 }}
                            placeholder="Ex. : patient indisponible"
                            maxLength={500}
                            required
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={pending}
                              className="btn-danger-solid"
                              style={{ height: 40, borderRadius: 12, fontSize: 13, padding: "0 16px" }}
                            >
                              {pending ? "…" : "Confirmer l'annulation"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancelingId(null)}
                              className="btn-secondary"
                              style={{ height: 40, fontSize: 13 }}
                            >
                              Retour
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-3 flex gap-2">
                          <form action={formAction}>
                            <input type="hidden" name="op" value="termine" />
                            <input type="hidden" name="id" value={a.id} />
                            <button
                              type="submit"
                              disabled={pending}
                              className="btn-primary"
                              style={{ height: 38, borderRadius: 11, fontSize: 13, padding: "0 14px" }}
                            >
                              Terminer
                            </button>
                          </form>
                          <button
                            type="button"
                            onClick={() => setCancelingId(a.id)}
                            className="btn-danger"
                          >
                            Annuler
                          </button>
                        </div>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
