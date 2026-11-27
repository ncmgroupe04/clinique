"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCare, updateCare, toggleCare, deleteCare, type CareState } from "@/app/actions/cares";
import {
  createCareCategory,
  updateCareCategory,
  toggleCareCategory,
  deleteCareCategory,
  type CategoryState,
} from "@/app/actions/care-categories";
import ConfirmActionButton from "../confirm-action-button";

type Care = { id: string; name: string; price: number; active: boolean; unit: string; category: string; cotation?: string | null };
type Category = { id: string; name: string; slug: string; active: boolean };

const categoryLabel = (categories: Category[], slug: string) =>
  categories.find((c) => c.slug === slug)?.name ?? slug;

// Valeurs par défaut si la table des catégories n'est pas encore disponible :
// le sélecteur de catégorie d'un soin ne doit jamais être vide.
const DEFAULT_CATEGORIES: Category[] = [
  { id: "default-diagnostic", name: "Diagnostic", slug: "diagnostic", active: true },
  { id: "default-intervention", name: "Intervention", slug: "intervention", active: true },
  { id: "default-produit", name: "Produit", slug: "produit", active: true },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} F`;
}

export default function SoinsClient({ cares, categories }: { cares: Care[]; categories: Category[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const categoryNameRef = useRef<HTMLInputElement>(null);
  const [createState, createAction, createPending] = useActionState<CareState, FormData>(createCare, undefined);
  const [editState, editAction, editPending] = useActionState<CareState, FormData>(updateCare, undefined);
  const [catCreateState, catCreateAction, catCreatePending] = useActionState<CategoryState, FormData>(createCareCategory, undefined);
  const [catEditState, catEditAction, catEditPending] = useActionState<CategoryState, FormData>(updateCareCategory, undefined);
  const [localCategories, setLocalCategories] = useState<Category[]>(() => {
    if (typeof window === "undefined") return DEFAULT_CATEGORIES;
    try {
      const stored = JSON.parse(localStorage.getItem("care_categories_fallback") ?? "null");
      return Array.isArray(stored) ? (stored as Category[]) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });
  const effectiveCategories = categories.length ? categories : localCategories;
  const activeCategories = effectiveCategories.filter((c) => c.active);
  useEffect(() => {
    if (typeof window !== "undefined" && categories.length === 0) {
      localStorage.setItem("care_categories_fallback", JSON.stringify(localCategories));
    }
  }, [localCategories, categories.length]);

  function addLocalCategory(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const slug = slugify(name);
    if (!name || !slug) return;
    setLocalCategories((prev) =>
      prev.some((c) => c.slug === slug)
        ? prev
        : [...prev, { id: `local-${Date.now()}`, name, slug, active: true }],
    );
  }

  const cleanCares = (list: Care[]) =>
    list.filter((c) => c.name.trim().toLowerCase() !== "extraction");
  const [localCares, setLocalCares] = useState<Care[]>(() => {
    if (typeof window === "undefined") return cleanCares(cares);
    try {
      const stored = JSON.parse(localStorage.getItem("cares_fallback") ?? "null");
      return Array.isArray(stored) ? cleanCares(stored as Care[]) : cleanCares(cares);
    } catch {
      return cleanCares(cares);
    }
  });
  const effectiveCares = categories.length ? cleanCares(cares) : localCares;
  useEffect(() => {
    if (typeof window !== "undefined" && categories.length === 0) {
      localStorage.setItem("cares_fallback", JSON.stringify(localCares));
    }
  }, [localCares, categories.length]);

  function addLocalCare(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const price = Number(formData.get("price") ?? 0) || 0;
    if (!name) return;
    setLocalCares((prev) => [
      ...prev,
      {
        id: `local-care-${Date.now()}`,
        name,
        price,
        active: true,
        unit: String(formData.get("unit") ?? "unité"),
        category: String(formData.get("category") ?? "intervention"),
        cotation: String(formData.get("cotation") ?? "") || null,
      },
    ]);
  }

  function updateLocalCare(id: string, formData: FormData) {
    setLocalCares((prev) => prev.map((c) => (c.id === id ? {
      ...c,
      name: String(formData.get("name") ?? "").trim() || c.name,
      price: Number(formData.get("price") ?? 0) || 0,
      unit: String(formData.get("unit") ?? "unité"),
      category: String(formData.get("category") ?? "intervention"),
      cotation: String(formData.get("cotation") ?? "") || null,
    } : c)));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (editState?.success) setEditingId(null);
  }, [editState]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (catEditState?.success) setEditingCategoryId(null);
  }, [catEditState]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="card flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Soins et prix</h2>
        </div>

        <div className="mb-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-[18px] border-[1.5px] border-dashed border-accent bg-[#EEF8F6] p-[14px]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-ink">Ajouter un soin</h3>
              <button type="button" onClick={() => nameRef.current?.focus()} className="go" style={{ height: 36, width: "auto", padding: "0 14px", borderRadius: 10, fontSize: 12 }}>
                + Ajouter un soin
              </button>
            </div>
            <form
              action={categories.length ? createAction : undefined}
              onSubmit={categories.length ? undefined : (e) => {
                e.preventDefault();
                addLocalCare(new FormData(e.currentTarget));
                e.currentTarget.reset();
              }}
              className="flex flex-col gap-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="lbl" htmlFor="care-name">Nom du soin</label>
                  <input ref={nameRef} id="care-name" name="name" placeholder="Injection" required className="input" style={{ height: 44 }} />
                </div>
                <div>
                  <label className="lbl" htmlFor="care-price">Prix (F CFA)</label>
                  <input id="care-price" name="price" type="number" min={0} step={1} placeholder="1 000" required className="input" style={{ height: 44 }} />
                </div>
                <div>
                  <label className="lbl" htmlFor="care-unit">Comptage</label>
                  <select id="care-unit" name="unit" className="input" defaultValue="unité" style={{ height: 44 }}>
                    <option value="unité">Unité</option>
                    <option value="nuit">Nuit</option>
                    <option value="jour">Jour</option>
                    <option value="séance">Séance</option>
                  </select>
                </div>
                <div>
                  <label className="lbl" htmlFor="care-category">Catégorie</label>
                  <select id="care-category" name="category" className="input" defaultValue="intervention" style={{ height: 44 }}>
                    {activeCategories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="lbl" htmlFor="care-cotation">Cotation</label>
                  <input id="care-cotation" name="cotation" maxLength={50} placeholder="Ex. D5" className="input" style={{ height: 44 }} />
                </div>
              </div>
              <button type="submit" disabled={createPending} className="go" style={{ height: 44, width: "auto", padding: "0 20px", borderRadius: 12, fontSize: 14 }}>
                {createPending ? "Ajout…" : "Enregistrer"}
              </button>
            </form>
            {createState?.message && (
              <p className={createState.success ? "mt-2 text-sm text-accent" : "mt-2 text-sm text-danger"}>{createState.message}</p>
            )}
          </div>

          <div className="rounded-[18px] border-[1.5px] border-dashed border-accent bg-[#EEF8F6] p-[14px]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-ink">Ajouter une catégorie</h3>
              <button type="button" onClick={() => categoryNameRef.current?.focus()} className="go" style={{ height: 36, width: "auto", padding: "0 14px", borderRadius: 10, fontSize: 12 }}>
                + Ajouter une catégorie
              </button>
            </div>
            <form
              action={categories.length ? catCreateAction : undefined}
              onSubmit={categories.length ? undefined : (e) => {
                e.preventDefault();
                addLocalCategory(new FormData(e.currentTarget));
                e.currentTarget.reset();
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1">
                <label className="lbl" htmlFor="category-name">Nom de la catégorie</label>
                <input ref={categoryNameRef} id="category-name" name="name" placeholder="Ex. Hospitalisation" required className="input" style={{ height: 44 }} />
              </div>
              <button type="submit" disabled={catCreatePending} className="go" style={{ height: 44, width: "auto", padding: "0 20px", borderRadius: 12, fontSize: 14 }}>
                {catCreatePending ? "Ajout…" : "Enregistrer"}
              </button>
            </form>
            {catCreateState?.message && (
              <p className={catCreateState.success ? "mt-2 text-sm text-accent" : "mt-2 text-sm text-danger"}>{catCreateState.message}</p>
            )}
            {catCreateState?.errors?.name && (
              <p className="mt-1 text-sm text-danger">{catCreateState.errors.name}</p>
            )}
          </div>
        </div>

        {effectiveCares.length === 0 ? (
          <p className="py-3 text-sm text-muted">Aucun soin pour le moment.</p>
        ) : (
          <div>
            {effectiveCares.map((c) => (
              <div key={c.id} className="ln" style={{ paddingTop: 6, paddingBottom: 6 }}>
                {editingId === c.id ? (
                  <div className="flex w-full flex-col gap-3">
                    <form
                      action={categories.length ? editAction : undefined}
                      onSubmit={categories.length ? undefined : (e) => {
                        e.preventDefault();
                        updateLocalCare(c.id, new FormData(e.currentTarget));
                        setEditingId(null);
                      }}
                      className="flex flex-wrap items-end gap-3"
                    >
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
                          {!activeCategories.some((cat) => cat.slug === c.category) ? (
                            <option value={c.category}>{categoryLabel(effectiveCategories, c.category)}</option>
                          ) : null}
                          {activeCategories.map((cat) => (
                            <option key={cat.id} value={cat.slug}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ width: 120 }}>
                        <label className="lbl" htmlFor={`cotation-${c.id}`}>Cotation</label>
                        <input id={`cotation-${c.id}`} name="cotation" defaultValue={c.cotation ?? ""} maxLength={50} placeholder="Ex. D5" className="input" />
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
                          {categoryLabel(effectiveCategories, c.category)}
                        </span>
                      )}
                      {c.cotation && <span className="ml-2 rounded-md bg-[#DFF3EF] px-1.5 py-0.5 text-[10px] font-bold text-[#0B5F54]">{c.cotation}</span>}
                      {c.unit && c.unit !== "unité" && <span className="ml-2 text-xs font-medium text-muted">({c.unit})</span>}
                    </div>
                    <b className="text-lg">{fcfa(c.price)}</b>
                    <span className={`cd ${c.active ? "" : "off"}`} style={{ width: 70 }}>
                      {c.active ? "Actif" : "Inactif"}
                    </span>
                    {categories.length === 0 ? (
                      <>
                        <button type="button" onClick={() => setEditingId(c.id)} aria-label={`Modifier ${c.name}`} className="btn-edit-solid" style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#475569", color: "#fff" }}>
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocalCares((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)))}
                          className={c.active ? "btn-warning-solid" : "btn-secondary"}
                          style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: c.active ? "#dbeafe" : undefined, color: c.active ? "#1e40af" : "#fff" }}
                        >
                          {c.active ? "Désactiver" : "Réactiver"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocalCares((prev) => prev.filter((x) => x.id !== c.id))}
                          className="btn-danger-solid"
                          style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#dc2626", color: "#fff" }}
                        >
                          Supprimer
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setEditingId(c.id)} aria-label={`Modifier ${c.name}`} className="btn-edit-solid" style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#475569", color: "#fff" }}>
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
                          confirmClassName={c.active ? "btn-warning-solid" : "btn-primary"}
                          buttonClassName={c.active ? "btn-warning-solid" : "btn-secondary"}
                          buttonStyle={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#dbeafe", color: "#1e40af" }}
                        />
                        <DeleteCareButton id={c.id} />
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

      </section>

      <section className="card flex min-w-0 flex-col">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Catégories</h2>
            <p className="mt-0.5 text-xs text-muted">Liste personnalisable de votre structure, utilisée pour classer les soins.</p>
          </div>
        </div>

        {effectiveCategories.length === 0 ? (
          <p className="py-3 text-sm text-muted">Aucune catégorie pour le moment.</p>
        ) : (
          <div>
            {effectiveCategories.map((cat) => (
              <div key={cat.id} className="ln" style={{ paddingTop: 6, paddingBottom: 6 }}>
                {editingCategoryId === cat.id ? (
                  <div className="flex w-full flex-col gap-3">
                    <form action={catEditAction} className="flex flex-wrap items-end gap-3">
                      <input type="hidden" name="id" value={cat.id} />
                      <div className="min-w-[180px] flex-1">
                        <label className="lbl" htmlFor={`cat-name-${cat.id}`}>Nom de la catégorie</label>
                        <input id={`cat-name-${cat.id}`} name="name" defaultValue={cat.name} required className="input" />
                      </div>
                      <button type="submit" disabled={catEditPending} className="go" style={{ height: 52, width: "auto", padding: "0 24px", borderRadius: 14, fontSize: 15 }}>
                        {catEditPending ? "…" : "Enregistrer"}
                      </button>
                      <button type="button" onClick={() => setEditingCategoryId(null)} className="btn-secondary" style={{ height: 52 }}>
                        Annuler
                      </button>
                    </form>
                    {catEditState?.message && (
                      <p className={catEditState.success ? "text-sm text-accent" : "text-sm text-danger"}>{catEditState.message}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex-1 font-bold">{cat.name}</div>
                    <span className={`cd ${cat.active ? "" : "off"}`} style={{ width: 70 }}>
                      {cat.active ? "Active" : "Inactive"}
                    </span>
                    {categories.length === 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setLocalCategories((prev) => prev.map((x) => (x.id === cat.id ? { ...x, active: !x.active } : x)))}
                          className={cat.active ? "btn-warning-solid" : "btn-secondary"}
                          style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: cat.active ? "#dbeafe" : undefined, color: cat.active ? "#1e40af" : "#fff" }}
                        >
                          {cat.active ? "Désactiver" : "Réactiver"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocalCategories((prev) => prev.filter((x) => x.id !== cat.id))}
                          className="btn-danger-solid"
                          style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#dc2626", color: "#fff" }}
                        >
                          Supprimer
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setEditingCategoryId(cat.id)} aria-label={`Modifier ${cat.name}`} className="btn-edit-solid" style={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#475569", color: "#fff" }}>
                          Modifier
                        </button>
                        <ConfirmActionButton
                          label={cat.active ? "Désactiver" : "Réactiver"}
                          confirmTitle={cat.active ? "Désactiver cette catégorie ?" : "Réactiver cette catégorie ?"}
                          confirmMessage={cat.active ? "La catégorie ne sera plus proposée lors de la création d'un soin." : "La catégorie sera à nouveau disponible."}
                          formAction={toggleCareCategory}
                          hiddenInputs={[
                            { name: "id", value: cat.id },
                            { name: "active", value: cat.active ? "false" : "true" },
                          ]}
                          confirmClassName={cat.active ? "btn-warning-solid" : "btn-primary"}
                          buttonClassName={cat.active ? "btn-warning-solid" : "btn-secondary"}
                          buttonStyle={{ height: 32, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto", background: "#dbeafe", color: "#1e40af" }}
                        />
                        <DeleteCategoryButton id={cat.id} />
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
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

function DeleteCategoryButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteCareCategory, undefined);
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
            <h3 className="text-lg font-extrabold text-ink">Supprimer cette catégorie ?</h3>
            <p className="mt-2 text-sm text-muted">
              Cette action est définitive. Une catégorie utilisée par des soins ne peut pas être supprimée : désactivez-la plutôt.
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
