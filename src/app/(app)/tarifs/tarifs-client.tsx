"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import {
  createService,
  updateService,
  toggleService,
  deleteService,
  type TarifState,
} from "@/app/actions/tarifs";
import { updatePaperWidth } from "@/app/actions/settings";
import ConfirmActionButton from "../confirm-action-button";

type Service = {
  id: string;
  name: string;
  price: number;
  active: boolean;
};

function fcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} F`;
}

export default function TarifsClient({
  services,
  printFormat,
  nextReceipt,
}: {
  services: Service[];
  printFormat: string;
  nextReceipt: { year: number; number: number };
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [localServices, setLocalServices] = useState<Service[]>(() => {
    if (typeof window === "undefined") return services;
    try {
      const stored = JSON.parse(localStorage.getItem("services_fallback") ?? "null");
      return Array.isArray(stored) && stored.length ? (stored as Service[]) : services;
    } catch {
      return services;
    }
  });
  const effectiveServices = localServices;
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("services_fallback", JSON.stringify(localServices));
    }
  }, [localServices]);

  function addLocalService(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const price = Number(formData.get("price") ?? 0) || 0;
    if (!name) return;
    setLocalServices((prev) => [...prev, { id: `local-service-${Date.now()}`, name, price, active: true }]);
  }

  function updateLocalService(id: string, formData: FormData) {
    setLocalServices((prev) => prev.map((s) => (s.id === id ? {
      ...s,
      name: String(formData.get("name") ?? "").trim() || s.name,
      price: Number(formData.get("price") ?? 0) || 0,
    } : s)));
  }
  const [createState, createAction, createPending] = useActionState<
    TarifState,
    FormData
  >(createService, undefined);
  const [editState, editAction, editPending] = useActionState<TarifState, FormData>(
    updateService,
    undefined,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (editState?.success) setEditingId(null);
  }, [editState]);

  return (
    <div className="flex flex-1 flex-col items-stretch gap-7 lg:flex-row">
      <section className="card flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Services et prix</h2>
          <button
            type="button"
            onClick={() => nameRef.current?.focus()}
            className="go"
            style={{ height: 48, width: "auto", padding: "0 22px", borderRadius: 14, fontSize: 15 }}
          >
            + Ajouter un service
          </button>
        </div>

        {effectiveServices.length === 0 ? (
          <p className="py-3 text-sm text-muted">Aucun service pour le moment.</p>
        ) : (
          <div>
            {effectiveServices.map((s) => (
              <div key={s.id} className="ln">
                {editingId === s.id ? (
                  <div className="flex w-full flex-col gap-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        updateLocalService(s.id, new FormData(e.currentTarget));
                        setEditingId(null);
                      }}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <input type="hidden" name="id" value={s.id} />
                      <div className="min-w-[180px] flex-1">
                        <label className="lbl" htmlFor={`name-${s.id}`}>
                          Nom du service
                        </label>
                        <input
                          id={`name-${s.id}`}
                          name="name"
                          defaultValue={s.name}
                          required
                          className="in"
                        />
                      </div>
                      <div style={{ width: 150 }}>
                        <label className="lbl" htmlFor={`price-${s.id}`}>
                          Prix (F CFA)
                        </label>
                        <input
                          id={`price-${s.id}`}
                          name="price"
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={s.price}
                          required
                          className="in"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={editPending}
                        className="go"
                        style={{ height: 52, width: "auto", padding: "0 24px", borderRadius: 14, fontSize: 15 }}
                      >
                        {editPending ? "…" : "Enregistrer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="btn-secondary"
                        style={{ height: 52 }}
                      >
                        Annuler
                      </button>
                    </form>

                    {editState?.message && (
                      <p
                        className={
                          editState.success ? "text-sm text-accent" : "text-sm text-danger"
                        }
                      >
                        {editState.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex-1 font-bold">{s.name}</div>
                    <b className="text-lg">{fcfa(s.price)}</b>
                    <span
                      className={`cd ${s.active ? "" : "off"}`}
                      style={{ width: 70 }}
                    >
                      {s.active ? "Actif" : "Inactif"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingId(s.id)}
                      aria-label={`Modifier ${s.name}`}
                      className="btn-edit-solid"
                      style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#475569", color: "#fff" }}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocalServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)))}
                      className={s.active ? "btn-warning-solid" : "btn-secondary"}
                      style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: s.active ? "#dbeafe" : undefined, color: s.active ? "#1e40af" : "#0B1F2A" }}
                    >
                      {s.active ? "Désactiver ce service" : "Réactiver ce service"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocalServices((prev) => prev.filter((x) => x.id !== s.id))}
                      className="btn-danger-solid"
                      style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#dc2626", color: "#fff" }}
                    >
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addLocalService(new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
          className="mt-3.5 flex flex-col gap-3 rounded-[18px] border-[1.5px] border-dashed border-accent bg-[#EEF8F6] p-[18px] sm:flex-row sm:items-end"
        >
          <div style={{ flex: 2 }}>
            <label className="lbl" htmlFor="service-name">
              Nom du service
            </label>
            <input
              ref={nameRef}
              id="service-name"
              name="name"
              placeholder="Échographie"
              required
              className="in"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="lbl" htmlFor="service-price">
              Prix (F CFA)
            </label>
            <input
              id="service-price"
              name="price"
              type="number"
              min={0}
              step={1}
              placeholder="10 000"
              required
              className="in"
            />
          </div>
          <button
            type="submit"
            disabled={createPending}
            className="go"
            style={{ height: 52, width: "auto", padding: "0 24px", borderRadius: 14, fontSize: 15 }}
          >
            {createPending ? "Ajout…" : "Enregistrer"}
          </button>
        </form>

        {createState?.message && (
          <p
            className={
              createState.success ? "mt-3 text-sm text-accent" : "mt-3 text-sm text-danger"
            }
          >
            {createState.message}
          </p>
        )}
        {createState?.errors?.name && (
          <p className="mt-2 text-sm text-danger">{createState.errors.name}</p>
        )}
        {createState?.errors?.price && (
          <p className="mt-2 text-sm text-danger">{createState.errors.price}</p>
        )}

        <div className="mt-auto pt-6 text-[13px] text-muted">
          Changer un prix ne modifie jamais les anciens reçus.
        </div>
      </section>

      <div className="flex w-full flex-col gap-[18px] lg:w-[400px] lg:shrink-0">
        <section className="card">
          <h2 className="mb-3.5 text-lg font-extrabold">Impression du ticket</h2>
          <span className="lbl">Format du papier</span>
          <form action={updatePaperWidth} className="flex flex-col gap-3">
            <button
              type="submit"
              name="print_format"
              value="80"
              className={`chip ${printFormat === "80" ? "on" : ""}`}
            >
              Thermique 80 mm<span>Zone imprimable 72 mm · par défaut</span>
            </button>
            <button
              type="submit"
              name="print_format"
              value="58"
              className={`chip ${printFormat === "58" ? "on" : ""}`}
            >
              Thermique 58 mm<span>Zone imprimable 48 mm</span>
            </button>
            <button
              type="submit"
              name="print_format"
              value="a6"
              className={`chip ${printFormat === "a6" ? "on" : ""}`}
            >
              Papier normal A6<span>105 × 148 mm · noir sur blanc</span>
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="mb-2.5 text-lg font-extrabold">Numérotation des reçus</h2>
          <div className="text-[32px] font-extrabold tracking-[-0.5px] text-accent">
            Reçu {nextReceipt.year}-{String(nextReceipt.number).padStart(4, "0")}
          </div>
          <p className="mt-2.5 text-sm leading-normal text-muted">
            Le numéro repart à 0001 chaque 1er janvier : Reçu {nextReceipt.year + 1}-0001.
            Recherche et filtre par année.
          </p>
        </section>
      </div>
    </div>
  );
}

function DeleteServiceButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<TarifState, FormData>(deleteService, undefined);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-danger-solid"
        style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#dc2626", color: "#fff" }}
        title={state?.message}
      >
        Supprimer
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(11, 31, 42, 0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-ink">Supprimer ce service ?</h3>
            <p className="mt-2 text-sm text-muted">
              Cette action est définitive. Un service déjà utilisé dans un ticket ne peut pas être supprimé.
            </p>
            {state?.message && <p className="mt-2 text-sm text-danger">{state.message}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary" style={{ height: 40, padding: "0 18px", borderRadius: 12, fontSize: 13 }}>
                Annuler
              </button>
              <form action={action}>
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-danger-solid"
                  style={{ height: 40, padding: "0 18px", borderRadius: 12, fontSize: 13, width: "auto" }}
                  onClick={() => setOpen(false)}
                >
                  {pending ? "…" : "Supprimer"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
