"use client";

import { useActionState, useState } from "react";
import {
  createService,
  updateService,
  toggleService,
  type TarifState,
} from "@/app/actions/tarifs";
import { formatCfa } from "@/lib/format";

type Service = {
  id: string;
  name: string;
  price: number;
  active: boolean;
};

export default function TarifsClient({ services }: { services: Service[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState<
    TarifState,
    FormData
  >(createService, undefined);
  const [editState, editAction, editPending] = useActionState<TarifState, FormData>(
    updateService,
    undefined,
  );

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-lg font-bold text-[#0B1F2A] mb-4">
          Ajouter un service
        </h2>
        <form action={createAction} className="flex flex-col sm:flex-row gap-3">
          <input
            name="name"
            placeholder="Nom du service"
            required
            className="flex-1 input"
          />
          <input
            name="price"
            type="number"
            min={0}
            step={1}
            placeholder="Prix (F CFA)"
            required
            className="sm:w-40 input"
          />
          <button
            type="submit"
            disabled={createPending}
            className="btn-primary disabled:opacity-60"
          >
            {createPending ? "Ajout…" : "Ajouter"}
          </button>
        </form>
        {createState?.message && (
          <p
            className={
              createState.success
                ? "text-[#0B7A6B] text-sm mt-3"
                : "text-[#DC2626] text-sm mt-3"
            }
          >
            {createState.message}
          </p>
        )}
        {createState?.errors?.name && (
          <p className="text-[#DC2626] text-sm mt-2">{createState.errors.name}</p>
        )}
        {createState?.errors?.price && (
          <p className="text-[#DC2626] text-sm mt-2">{createState.errors.price}</p>
        )}
      </section>

      <section className="card">
        <h2 className="text-lg font-bold text-[#0B1F2A] mb-4">Tarifs</h2>
        {services.length === 0 ? (
          <p className="text-[#4B5F6B] text-sm">Aucun service pour le moment.</p>
        ) : (
          <ul className="divide-y divide-[#E2EAEF]">
            {services.map((s) => (
              <li key={s.id} className="py-3">
                {editingId === s.id ? (
                  <form action={editAction} className="flex flex-col gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      name="name"
                      defaultValue={s.name}
                      required
                      className="input"
                    />
                    <input
                      name="price"
                      type="number"
                      min={0}
                      step={1}
                      defaultValue={s.price}
                      required
                      className="input"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={editPending}
                        className="btn-primary w-full sm:w-auto disabled:opacity-60"
                      >
                        {editPending ? "…" : "Enregistrer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="btn-secondary text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                    {editState?.message && editingId === s.id && (
                      <p
                        className={
                          editState.success
                            ? "text-[#0B7A6B] text-sm"
                            : "text-[#DC2626] text-sm"
                        }
                      >
                        {editState.message}
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#0B1F2A]">{s.name}</p>
                      <p className="text-sm text-[#4B5F6B]">
                        {formatCfa(s.price)}
                        {!s.active && (
                          <span className="ml-2 text-xs text-[#DC2626]">
                            (désactivé)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(s.id)}
                        className="text-sm font-semibold text-[#0B7A6B]"
                      >
                        Modifier
                      </button>
                      <form action={toggleService}>
                        <input type="hidden" name="id" value={s.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={s.active ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className="text-sm font-medium text-[#4B5F6B]"
                        >
                          {s.active ? "Désactiver" : "Réactiver"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {editState?.message && editingId === null && (
          <p
            className={
              editState.success
                ? "text-[#0B7A6B] text-sm mt-3"
                : "text-[#DC2626] text-sm mt-3"
            }
          >
            {editState.message}
          </p>
        )}
      </section>
    </div>
  );
}



