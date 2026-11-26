"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCare, updateCare, toggleCare, deleteCare, type CareState } from "@/app/actions/cares";
import ConfirmActionButton from "../confirm-action-button";

type Care = { id: string; name: string; price: number; active: boolean; unit: string; category: string };

const CATEGORIES = [
  { value: "diagnostic", label: "Diagnostic" },
  { value: "intervention", label: "Intervention" },
  { value: "produit", label: "Produit" },
];

function fcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} F`;
}

export default function SoinsClient({ cares }: { cares: Care[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [createState, createAction, createPending] = useActionState<CareState, FormData>(createCare, undefined);
  const [editState, editAction, editPending] = useActionState<CareState, FormData>(updateCare, undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (editState?.success) setEditingId(null);
  }, [editState]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="card flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Soins et prix</h2>
          <button
            type="button"
            onClick={() => nameRef.current?.focus()}
            className="go"
            style={{ height: 48, width: "auto", padding: "0 22px", borderRadius: 14, fontSize: 15 }}
          >
            + Ajouter un soin
          </button>
        </div>

        {cares.length === 0 ? (
          <p className="py-3 text-sm text-muted">Aucun soin pour le moment.</p>
        ) : (
          <div>
            {cares.map((c) => (
              <div key={c.id} className="ln">
                {editingId === c.id ? (
                  <div className="flex w-full flex-col gap-3">
                    <form action={editAction} className="flex flex-wrap items-end gap-3">
                      <input type="hidden" name="id" value={c.id} />
                      <div className="min-w-[180px] flex-1">
                        <label className="lbl" htmlFor={`name-${c.id}`}>Nom du soin</label>
                        <input id={`name-${c.id}`} name="name" defaultValue={c.name} required className="input" />
                      </div>
                      <div style={{ width: 150 }}>
                        <label className="lbl" htmlFor={`price-${c.id}`}>Prix (F CFA)</label>
                        <input id={`price-${c.id}`} name="price" type="number" min={0} step={1} defaultValue={c.price} required className="input" />
                      </div>
                      <div style={{ width: 120 }}>
                        <label className="lbl" htmlFor={`unit-${c.id}`}>Comptage</label>
                        <select id={`unit-${c.id}`} name="unit" className="input" defaultValue={c.unit ?? "unité"}>
                          <option value="unité">Unité</option>
                          <option value="nuit">Nuit</option>
                          <option value="jour">Jour</option>
                          <option value="séance">Séance</option>
                        </select>
                      </div>
                      <div style={{ width: 140 }}>
                        <label className="lbl" htmlFor={`category-${c.id}`}>Catégorie</label>
                        <select id={`category-${c.id}`} name="category" className="input" defaultValue={c.category ?? "intervention"}>
                          {CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" disabled={editPending} className="go" style={{ height: 52, width: "auto", padding: "0 24px", borderRadius: 14, fontSize: 15 }}>
                        {editPending ? "…" : "Enregistrer"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn-secondary" style={{ height: 52 }}>
                        Annuler
                      </button>
                    </form>
                    {editState?.message && (
                      <p className={editState.success ? "text-sm text-accent" : "text-sm text-danger"}>{editState.message}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex-1 font-bold">
                      {c.name}
                      {c.category && (
                        <span className="ml-2 rounded-md bg-accent-light px-1.5 py-0.5 text-[10px] font-bold text-accent-text">
                          {CATEGORIES.find((cat) => cat.value === c.category)?.label ?? c.category}
                        </span>
                      )}
                      {c.unit && c.unit !== "unité" && <span className="ml-2 text-xs font-medium text-muted">({c.unit})</span>}
                    </div>
                    <b className="text-lg">{fcfa(c.price)}</b>
                    <span className={`cd ${c.active ? "" : "off"}`} style={{ width: 70 }}>
                      {c.active ? "Actif" : "Inactif"}
                    </span>
                    <button type="button" onClick={() => setEditingId(c.id)} aria-label={`Modifier ${c.name}`} className="x" style={{ width: "auto", padding: "0 16px", fontSize: 13, fontWeight: 600 }}>
                      Modifier
                    </button>
                    <ConfirmActionButton
                      label={c.active ? "Désactiver" : "Réactiver"}
                      confirmTitle={c.active ? "Désactiver ce soin ?" : "Réactiver ce soin ?"}
                      confirmMessage={c.active ? "Le soin ne sera plus proposé à la facturation." : "Le soin sera à nouveau disponible."}
                      formAction={toggleCare}
                      hiddenInputs={[
                        { name: "id", value: c.id },
                        { name: "active", value: c.active ? "false" : "true" },
                      ]}
                      buttonClassName="text-sm font-medium text-muted underline-offset-2 hover:underline"
                      buttonStyle={{ padding: "0 6px" }}
                    />
                    <DeleteCareButton id={c.id} />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form action={createAction} className="mt-3.5 flex flex-col gap-3 rounded-[18px] border-[1.5px] border-dashed border-accent bg-[#EEF8F6] p-[18px] sm:flex-row sm:items-end">
          <div style={{ flex: 2 }}>
            <label className="lbl" htmlFor="care-name">Nom du soin</label>
            <input ref={nameRef} id="care-name" name="name" placeholder="Injection" required className="input" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="lbl" htmlFor="care-price">Prix (F CFA)</label>
            <input id="care-price" name="price" type="number" min={0} step={1} placeholder="1 000" required className="input" />
          </div>
          <div style={{ flex: 0.6 }}>
            <label className="lbl" htmlFor="care-unit">Comptage</label>
            <select id="care-unit" name="unit" className="input" defaultValue="unité">
              <option value="unité">Unité</option>
              <option value="nuit">Nuit</option>
              <option value="jour">Jour</option>
              <option value="séance">Séance</option>
            </select>
          </div>
          <div style={{ flex: 0.7 }}>
            <label className="lbl" htmlFor="care-category">Catégorie</label>
            <select id="care-category" name="category" className="input" defaultValue="intervention">
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={createPending} className="go" style={{ height: 52, width: "auto", padding: "0 24px", borderRadius: 14, fontSize: 15 }}>
            {createPending ? "Ajout…" : "Enregistrer"}
          </button>
        </form>

        {createState?.message && (
          <p className={createState.success ? "mt-3 text-sm text-accent" : "mt-3 text-sm text-danger"}>{createState.message}</p>
        )}
      </section>
    </div>
  );
}

function DeleteCareButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteCare, {});
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-danger underline-offset-2 hover:underline"
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
            <h3 className="text-lg font-extrabold text-ink">Supprimer ce soin ?</h3>
            <p className="mt-2 text-sm text-muted">
              Cette action est définitive. Un soin déjà utilisé dans une facture ne peut pas être supprimé.
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
