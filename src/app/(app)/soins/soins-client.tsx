"use client";

import { useActionState, useRef, useState } from "react";
import { createCare, updateCare, toggleCare, type CareState } from "@/app/actions/cares";

type Care = { id: string; name: string; price: number; active: boolean };

function fcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} F`;
}

export default function SoinsClient({ cares }: { cares: Care[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [createState, createAction, createPending] = useActionState<CareState, FormData>(createCare, undefined);
  const [editState, editAction, editPending] = useActionState<CareState, FormData>(updateCare, undefined);

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
                    <div className="flex-1 font-bold">{c.name}</div>
                    <b className="text-lg">{fcfa(c.price)}</b>
                    <span className={`cd ${c.active ? "" : "off"}`} style={{ width: 70 }}>
                      {c.active ? "Actif" : "Inactif"}
                    </span>
                    <button type="button" onClick={() => setEditingId(c.id)} aria-label={`Modifier ${c.name}`} className="x" style={{ width: "auto", padding: "0 16px", fontSize: 13, fontWeight: 600 }}>
                      Modifier
                    </button>
                    <form action={toggleCare}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                      <button type="submit" className="text-sm font-medium text-muted underline-offset-2 hover:underline">
                        {c.active ? "Désactiver" : "Réactiver"}
                      </button>
                    </form>
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
