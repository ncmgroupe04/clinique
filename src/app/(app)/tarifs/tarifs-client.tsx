"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createService,
  updateService,
  toggleService,
  deleteService,
  type TarifState,
} from "@/app/actions/tarifs";
import { updatePaperWidth } from "@/app/actions/settings";

type Service = {
  id: string;
  name: string;
  price: number;
  active: boolean;
};

const LOCAL_PREFIX = "local-service-";
const LOCAL_KEY = "services_local_extra";
const LEGACY_KEY = "services_fallback";

function fcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} F`;
}

const cleanServices = (list: Service[]) =>
  list.filter(
    (s) => !(s.name.trim().toLowerCase() === "visite prénatale" && s.price === 3000),
  );

/** Services créés hors ligne, conservés sur cet appareil uniquement. */
function readLocalServices(): Service[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
    if (Array.isArray(stored)) return stored as Service[];
  } catch {
    /* ignore */
  }
  return [];
}

export default function TarifsClient({
  services,
  printFormat,
  nextReceipt,
  autoFocus,
}: {
  services: Service[];
  printFormat: string;
  nextReceipt: { year: number; number: number };
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  const [dbServices, setDbServices] = useState<Service[]>(() => cleanServices(services));
  const [localServices, setLocalServices] = useState<Service[]>([]);

  // La base est la source de vérité : on resynchronise dès qu'elle répond.
  useEffect(() => {
    setDbServices(cleanServices(services));
  }, [services]);

  // Récupère les éventuels services hors ligne, puis purge l'ancien cache
  // complet qui provoquait la divergence avec l'écran Nouveau Ticket.
  useEffect(() => {
    const locals = readLocalServices();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalServices(locals);
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "null");
      if (Array.isArray(legacy)) {
        const legacyLocals = (legacy as Service[]).filter((s) => s.id.startsWith(LOCAL_PREFIX));
        if (legacyLocals.length > 0 && locals.length === 0) {
          setLocalServices(legacyLocals);
          localStorage.setItem(LOCAL_KEY, JSON.stringify(legacyLocals));
        }
      }
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      localStorage.removeItem(LEGACY_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localServices));
  }, [localServices]);

  // Accès rapide « Nouveau tarif » : on ouvre directement la saisie.
  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  const effectiveServices = [...dbServices, ...localServices];
  const isLocal = (id: string) => id.startsWith(LOCAL_PREFIX);

  const showState = (state: TarifState, fallback: string) => {
    if (state?.success) {
      setNotice({ error: false, text: state.message ?? fallback });
      return true;
    }
    const errors = state?.errors ? Object.values(state.errors).flat().join(" ") : "";
    setNotice({ error: true, text: errors || state?.message || fallback });
    return false;
  };

  async function handleCreate(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const price = Number(formData.get("price") ?? NaN);
    if (!name) {
      setNotice({ error: true, text: "Nom requis." });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setNotice({ error: true, text: "Prix invalide." });
      return;
    }
    setBusyId("create");
    const fd = new FormData();
    fd.set("name", name);
    fd.set("price", String(Math.round(price)));
    try {
      const state = await createService(undefined, fd);
      if (showState(state, "Service ajouté.")) router.refresh();
    } catch {
      setNotice({ error: true, text: "Ajout impossible : base indisponible." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdate(service: Service, formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const price = Number(formData.get("price") ?? NaN);
    if (!name) {
      setNotice({ error: true, text: "Nom requis." });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setNotice({ error: true, text: "Prix invalide." });
      return;
    }
    const value = Math.round(price);

    if (isLocal(service.id)) {
      setLocalServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, name, price: value } : s)),
      );
      setEditingId(null);
      setNotice({ error: false, text: "Service modifié (sur cet appareil)." });
      return;
    }

    setBusyId(service.id);
    const fd = new FormData();
    fd.set("id", service.id);
    fd.set("name", name);
    fd.set("price", String(value));
    try {
      const state = await updateService(undefined, fd);
      if (showState(state, "Service modifié.")) {
        setDbServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, name, price: value } : s)),
        );
        setEditingId(null);
        router.refresh();
      }
    } catch {
      setNotice({ error: true, text: "Modification impossible : base indisponible." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(service: Service) {
    const nextActive = !service.active;

    if (isLocal(service.id)) {
      setLocalServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, active: nextActive } : s)),
      );
      return;
    }

    setBusyId(service.id);
    setDbServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, active: nextActive } : s)),
    );
    const fd = new FormData();
    fd.set("id", service.id);
    fd.set("active", String(nextActive));
    try {
      await toggleService(fd);
      setNotice({
        error: false,
        text: nextActive ? "Service réactivé." : "Service désactivé.",
      });
      router.refresh();
    } catch {
      setDbServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, active: service.active } : s)),
      );
      setNotice({ error: true, text: "Changement impossible : base indisponible." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(service: Service) {
    setConfirmId(null);

    if (isLocal(service.id)) {
      setLocalServices((prev) => prev.filter((s) => s.id !== service.id));
      setNotice({ error: false, text: "Service supprimé (sur cet appareil)." });
      return;
    }

    setBusyId(service.id);
    const fd = new FormData();
    fd.set("id", service.id);
    try {
      const state = await deleteService(undefined, fd);
      if (showState(state, "Service supprimé.")) {
        setDbServices((prev) => prev.filter((s) => s.id !== service.id));
        router.refresh();
      }
    } catch {
      setNotice({ error: true, text: "Suppression impossible : base indisponible." });
    } finally {
      setBusyId(null);
    }
  }

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

        {notice && (
          <p className={`mb-2 text-sm ${notice.error ? "text-danger" : "text-accent"}`}>
            {notice.text}
          </p>
        )}

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
                        void handleUpdate(s, new FormData(e.currentTarget));
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
                        disabled={busyId === s.id}
                        className="go"
                        style={{ height: 52, width: "auto", padding: "0 24px", borderRadius: 14, fontSize: 15 }}
                      >
                        {busyId === s.id ? "…" : "Enregistrer"}
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
                  </div>
                ) : (
                  <>
                    <div className="flex-1 font-bold">{s.name}</div>
                    <b className="text-lg">{fcfa(s.price)}</b>
                    <span className={`cd ${s.active ? "" : "off"}`} style={{ width: 70 }}>
                      {s.active ? "Actif" : "Inactif"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setEditingId(s.id);
                      }}
                      aria-label={`Modifier ${s.name}`}
                      className="btn-edit-solid"
                      style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#475569", color: "#fff" }}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => void handleToggle(s)}
                      className={s.active ? "btn-warning-solid" : "btn-secondary"}
                      style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: s.active ? "#dbeafe" : undefined, color: s.active ? "#1e40af" : "#0B1F2A" }}
                    >
                      {s.active ? "Désactiver ce service" : "Réactiver ce service"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => setConfirmId(s.id)}
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
            const form = e.currentTarget;
            void handleCreate(new FormData(form)).then(() => form.reset());
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
            disabled={busyId === "create"}
            className="go"
            style={{ height: 52, width: "auto", padding: "0 24px", borderRadius: 14, fontSize: 15 }}
          >
            {busyId === "create" ? "Ajout…" : "Enregistrer"}
          </button>
        </form>

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

      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(11, 31, 42, 0.55)" }}
          onClick={() => setConfirmId(null)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-ink">Supprimer ce service ?</h3>
            <p className="mt-2 text-sm text-muted">
              Cette action est définitive. Un service déjà utilisé dans un ticket ne peut pas
              être supprimé : désactivez-le plutôt.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="btn-secondary"
                style={{ height: 40, padding: "0 18px", borderRadius: 12, fontSize: 13 }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = effectiveServices.find((s) => s.id === confirmId);
                  if (target) void handleDelete(target);
                }}
                className="btn-danger-solid"
                style={{ height: 40, padding: "0 18px", borderRadius: 12, fontSize: 13, width: "auto", background: "#dc2626", color: "#fff" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
