"use client";

import { useActionState, useState } from "react";
import { createInvoice, type InvoiceState } from "@/app/actions/invoices";
import { useRouter } from "next/navigation";

type Care = { id: string; name: string; price: number; unit: string; category: string; cotation?: string | null };
type Category = { name: string; slug: string; active: boolean };
type Line = { careId: string; name: string; price: string; qty: number; unit: string; cotation: string; dents: string };
type StructureInfo = { name: string | null; address: string | null; phone: string | null; header_text: string | null };
type TemplateInfo = { header_text: string | null; footer_text: string | null; settings?: Record<string, unknown> | null };

const DEFAULT_CATEGORIES: Category[] = [
  { name: "Diagnostic", slug: "diagnostic", active: true },
  { name: "Intervention", slug: "intervention", active: true },
  { name: "Produit", slug: "produit", active: true },
];

function fcfa(v: number): string {
  return `${v.toLocaleString("fr-FR")} F CFA`;
}

export default function FactureForm({
  cares,
  categories,
  structure,
  template,
  invoiceTemplate,
  favorites,
}: {
  cares: Care[];
  categories: Category[];
  structure: StructureInfo | null;
  template: TemplateInfo | null;
  invoiceTemplate: { settings: Record<string, unknown> } | null;
  favorites: string[];
}) {
  const [localCares] = useState<Care[]>(() => {
    const clean = (list: Care[]) => list.filter((c) => c.name.trim().toLowerCase() !== "extraction");
    if (typeof window === "undefined") return clean(cares);
    try {
      const stored = JSON.parse(localStorage.getItem("cares_fallback") ?? "null");
      if (!Array.isArray(stored)) return clean(cares);
      const extra = (stored as Care[]).filter((c) => !cares.some((existing) => existing.id === c.id));
      return clean([...cares, ...extra]);
    } catch {
      return clean(cares);
    }
  });
  const [localCategories] = useState<Category[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = JSON.parse(localStorage.getItem("care_categories_fallback") ?? "null");
      return Array.isArray(stored) ? (stored as Category[]) : [];
    } catch {
      return [];
    }
  });
  const effectiveCares = localCares;
  const effectiveCategories = categories.length
    ? categories
    : localCategories.length
      ? localCategories
      : DEFAULT_CATEGORIES;
  // Les soins les plus fréquemment facturés passent devant ; le reste est
  // accessible via le bouton « Voir tous les soins ».
  const favoriteRank = (care: Care) => {
    const index = favorites.indexOf(care.name);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const sortedCares = [...effectiveCares].sort(
    (a, b) => favoriteRank(a) - favoriteRank(b) || a.name.localeCompare(b.name, "fr"),
  );
  const favoriteCares = sortedCares.filter((c) => favoriteRank(c) !== Number.MAX_SAFE_INTEGER).slice(0, 8);
  const favoriteIds = new Set(favoriteCares.map((c) => c.id));
  const VISIBLE_LIMIT = 20;
  const visibleOthers = sortedCares
    .filter((c) => !favoriteIds.has(c.id))
    .slice(0, Math.max(0, VISIBLE_LIMIT - favoriteCares.length));
  const visibleIds = new Set([...favoriteCares, ...visibleOthers].map((c) => c.id));
  const hiddenCount = effectiveCares.length - visibleIds.size;

  const router = useRouter();
  const [state, action, pending] = useActionState<InvoiceState, FormData>(createInvoice, undefined);
  const [lines, setLines] = useState<Line[]>([]);
  const [patientName, setPatientName] = useState("");
  const [discount, setDiscount] = useState("");
  const [advance, setAdvance] = useState("");

  // Sélection en cours (cases cochées)
  const [selected, setSelected] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [priceOverride, setPriceOverride] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showAllCares, setShowAllCares] = useState(false);
  const [careSearch, setCareSearch] = useState("");

  if (state?.success && state.invoiceId) {
    router.push(`/factures/${state.invoiceId}`);
  }

  function toggleCare(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addSelected() {
    if (selected.length === 0) return;
    const override = priceOverride.trim() === "" ? null : Number(priceOverride);
    setLines((prev) => {
      const next = [...prev];
      for (const id of selected) {
        const care = effectiveCares.find((c) => c.id === id);
        if (!care) continue;
        const price = override !== null && Number.isFinite(override) && override >= 0 ? String(override) : String(care.price);
        const existing = next.findIndex((l) => l.careId === care.id);
        if (existing >= 0) {
          next[existing] = { ...next[existing], qty: next[existing].qty + qty, price };
        } else {
          next.push({ careId: care.id, name: care.name, price, qty, unit: care.unit ?? "unité", cotation: care.cotation ?? "", dents: "" });
        }
      }
      return next;
    });
    setSelected([]);
    setQty(1);
    setPriceOverride("");
  }

  const removeLine = (careId: string) => setLines((prev) => prev.filter((l) => l.careId !== careId));
  const setQtyLine = (careId: string, value: number) =>
    setLines((prev) => prev.map((l) => (l.careId === careId ? { ...l, qty: Math.max(1, value) } : l)));
  const setPriceLine = (careId: string, value: string) =>
    setLines((prev) => prev.map((l) => (l.careId === careId ? { ...l, price: value.replace(/[^0-9]/g, "") } : l)));
  const setCotationLine = (careId: string, value: string) =>
    setLines((prev) => prev.map((l) => (l.careId === careId ? { ...l, cotation: value } : l)));

  const discountValue = Number(discount) || 0;
  const advanceValue = Number(advance) || 0;
  const subtotal = lines.reduce((s, l) => s + (Number(l.price) || 0) * l.qty, 0);
  const total = Math.max(0, subtotal - discountValue);
  const reste = Math.max(0, total - advanceValue);

  const itemsJson = JSON.stringify(
    lines.map((l) => ({ care_id: l.careId, care_name: l.name, quantity: l.qty, unit_price: Number(l.price) || 0, cotation: l.cotation, dents: l.dents })),
  );

  const tpl = {
    title: "Facture",
    number_prefix: "",
    show_date: true,
    show_indice: true,
    show_quantity: true,
    show_unit_price: true,
    show_discount: true,
    show_advance: true,
    show_stamp: true,
    show_logo: true,
    doctor_name: "",
    practice_line: "",
    intro_text: "",
    legal_footer: "",
    ...(template?.settings ?? {}),
    ...(invoiceTemplate?.settings ?? {}),
  } as {
    title: string;
    number_prefix: string;
    show_date: boolean;
    show_indice: boolean;
    show_quantity: boolean;
    show_unit_price: boolean;
    show_discount: boolean;
    show_advance: boolean;
    show_stamp: boolean;
    show_logo: boolean;
    doctor_name: string;
    practice_line: string;
    intro_text: string;
    legal_footer: string;
  };

  return (
    <>
    <form action={action} className="flex flex-1 flex-col gap-6 lg:flex-row">
      <input type="hidden" name="items" value={itemsJson} />
      <section className="card flex min-w-0 flex-1 flex-col gap-5">
        <div>
          <label className="lbl" htmlFor="patient_name">Nom et prénom</label>
          <input
            id="patient_name"
            name="patient_name"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="input"
          />
        </div>

        {/* Liste à cocher groupée par catégorie */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="lbl">Ajouter un soin</span>
            {effectiveCares.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCareSearch("");
                  setShowAllCares(true);
                }}
                className="btn-secondary"
                style={{ height: 34, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto" }}
              >
                Voir tous les soins ({effectiveCares.length})
              </button>
            )}
          </div>
          {effectiveCares.length === 0 ? (
            <p className="text-sm text-muted">Aucun soin actif dans le catalogue.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {favoriteCares.length > 0 && (
                <div className="rounded-[18px] border border-accent bg-accent-light p-4">
                  <h3 className="mb-2 text-sm font-extrabold text-accent-text">★ Favoris</h3>
                  <div className="space-y-1.5">
                    {favoriteCares.map((care) => (
                      <label
                        key={care.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-ink hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(care.id)}
                          onChange={() => toggleCare(care.id)}
                          className="h-4 w-4 shrink-0 accent-accent"
                        />
                        <span className="truncate font-semibold">{care.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {effectiveCategories.filter((c) => c.active).map((group) => {
                const items = visibleOthers.filter((c) => (c.category ?? "intervention") === group.slug);
                if (items.length === 0) return null;
                return (
                  <div key={group.slug} className="rounded-[18px] border border-border bg-white p-4">
                    <h3 className="mb-2 text-sm font-extrabold text-ink">{group.name}</h3>
                    <div className="space-y-1.5">
                      {items.map((care) => (
                        <label
                          key={care.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-ink hover:bg-bg"
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(care.id)}
                            onChange={() => toggleCare(care.id)}
                            className="h-4 w-4 shrink-0 accent-accent"
                          />
                          <span className="truncate">{care.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {hiddenCount > 0 && (
            <p className="mt-2 text-xs text-muted">
              {hiddenCount} soin{hiddenCount > 1 ? "s" : ""} supplémentaire{hiddenCount > 1 ? "s" : ""} disponible{hiddenCount > 1 ? "s" : ""} dans « Voir tous les soins ».
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-input-border bg-white px-2" style={{ height: 52 }}>
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="x" style={{ width: 30, height: 30, fontSize: 16 }}>−</button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} className="x" style={{ width: 30, height: 30, fontSize: 16 }}>+</button>
            </div>
            <input
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="Prix ou remise (optionnel)"
              className="input flex-1"
              style={{ minWidth: 180 }}
            />
            <button
              type="button"
              onClick={addSelected}
              disabled={selected.length === 0}
              className="btn-secondary"
              style={{ height: 52, borderRadius: 14, fontSize: 14, width: "auto" }}
            >
              Ajouter à la facture
            </button>
          </div>
        </div>

        {/* Lignes de la facture */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted">
                <th className="py-2">Nom du soin</th>
                <th className="py-2 text-center">Dents</th>
                <th className="py-2 text-center">Indice</th>
                <th className="py-2 text-center">Quantité</th>
                <th className="py-2 text-right">Prix unitaire</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr><td colSpan={7} className="py-3 text-sm text-muted">Aucun soin ajouté.</td></tr>
              ) : (
                lines.map((l) => (
                  <tr key={l.careId} className="border-b border-border">
                    <td className="py-2 font-semibold">{l.name}</td>
                    <td className="py-2 text-center">
                      <input
                        type="text"
                        aria-label={`Dents ${l.name}`}
                        value={l.dents}
                        onChange={(e) => setLines((prev) => prev.map((x) => (x.careId === l.careId ? { ...x, dents: e.target.value } : x)))}
                        maxLength={30}
                        placeholder="—"
                        className="input text-center"
                        style={{ width: 70, height: 38, padding: "0 8px" }}
                      />
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="text"
                        aria-label={`Indice ${l.name}`}
                        value={l.cotation}
                        onChange={(e) => setCotationLine(l.careId, e.target.value)}
                        maxLength={50}
                        placeholder="—"
                        className="input text-center"
                        style={{ width: 84, height: 38, padding: "0 8px" }}
                      />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => setQtyLine(l.careId, l.qty - 1)} className="x" style={{ width: 28, height: 28, fontSize: 14 }}>−</button>
                        <span className="w-7 text-center font-bold">{l.qty}</span>
                        <button type="button" onClick={() => setQtyLine(l.careId, l.qty + 1)} className="x" style={{ width: 28, height: 28, fontSize: 14 }}>+</button>
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Prix unitaire ${l.name}`}
                        value={l.price}
                        onChange={(e) => setPriceLine(l.careId, e.target.value)}
                        className="input text-right"
                        style={{ width: 110, height: 38, padding: "0 10px" }}
                      />
                    </td>
                    <td className="py-2 text-right font-bold">{fcfa((Number(l.price) || 0) * l.qty)}</td>
                    <td className="py-2 text-right">
                      <button type="button" onClick={() => removeLine(l.careId)} className="x" style={{ width: 28, height: 28, fontSize: 13 }}>×</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="lbl" htmlFor="discount">Remise (F CFA)</label>
            <input
              id="discount"
              name="discount"
              type="text"
              inputMode="numeric"
              value={discount}
              onChange={(e) => setDiscount(e.target.value.replace(/[^0-9]/g, ""))}
              className="input"
            />
          </div>
          <div>
            <label className="lbl" htmlFor="advance">Avance payée (F CFA)</label>
            <input
              id="advance"
              name="advance"
              type="text"
              inputMode="numeric"
              value={advance}
              onChange={(e) => setAdvance(e.target.value.replace(/[^0-9]/g, ""))}
              className="input"
            />
          </div>
        </div>

        {state?.message && !state.success && (
          <p className="text-sm text-danger">{state.message}</p>
        )}
      </section>

      <aside className="flex w-full flex-col gap-4 lg:w-[360px] lg:shrink-0">
        <section className="card flex flex-1 flex-col gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Récapitulatif</h3>
          <div className="row"><span>Sous-total</span><span className="font-bold">{fcfa(subtotal)}</span></div>
          <div className="row"><span>Remise</span><span className="font-bold">−{fcfa(discountValue)}</span></div>
          <div className="border-t border-border pt-2">
            <div className="row" style={{ fontSize: 16, fontWeight: 800 }}><span>Total</span><span>{fcfa(total)}</span></div>
          </div>
          <div className="row"><span>Avance</span><span className="font-bold">{fcfa(advanceValue)}</span></div>
          <div className="row" style={{ fontSize: 16, fontWeight: 800, color: "#0b5f54" }}>
            <span>Reste à payer</span><span>{fcfa(reste)}</span>
          </div>
        </section>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          disabled={lines.length === 0}
          className="btn-secondary"
          style={{ height: 52, width: "100%", opacity: lines.length === 0 ? 0.55 : 1 }}
        >
          Aperçu de la facture
        </button>
        <button type="submit" disabled={pending || lines.length === 0} className="go">
          {pending ? "Enregistrement…" : "Enregistrer la facture"}
        </button>
      </aside>
    </form>

    {showPreview && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-auto p-4"
        style={{ background: "rgba(11,31,42,0.6)" }}
        onClick={() => setShowPreview(false)}
      >
        <div className="card w-full max-w-[760px]" onClick={(e) => e.stopPropagation()}>
          <div className="no-print mb-3 flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Aperçu de la facture</h3>
            <button type="button" onClick={() => setShowPreview(false)} className="btn-secondary" style={{ height: 40, padding: "0 16px" }}>
              Fermer
            </button>
          </div>
          <div className="mx-auto bg-white p-6" style={{ maxWidth: "210mm", fontFamily: "Arial, Helvetica, sans-serif" }}>
            <div className="text-center">
              <p className="font-bold text-lg leading-tight">{structure?.name || "Nom de la structure"}</p>
              {structure?.address && <p className="text-xs leading-tight">{structure.address}</p>}
              {structure?.phone && <p className="text-xs leading-tight">Tél. {structure.phone}</p>}
              {template?.header_text?.trim() && <p className="text-xs leading-tight mt-1">{template.header_text}</p>}
              {tpl.doctor_name?.trim() && <p className="text-xs leading-tight mt-1 font-bold">{tpl.doctor_name}</p>}
              {tpl.practice_line?.trim() && <p className="text-xs leading-tight">{tpl.practice_line}</p>}
            </div>
            <div className="border-t border-dashed border-gray-400 my-2" />
            <p className="text-center font-bold" style={{ fontSize: 20 }}>
              {`${tpl.title || "Facture"} ${tpl.number_prefix}${new Date().getFullYear()}-0001`}
            </p>
            <p className="text-xs text-center mt-1">{new Date().toLocaleDateString("fr-FR")}</p>
            {tpl.intro_text?.trim() && <p className="mt-2 text-xs italic leading-relaxed">{tpl.intro_text}</p>}
            <div className="border-t border-dashed border-gray-400 my-2" />
            <p className="text-sm"><span className="font-bold">Patient :</span> {patientName || "—"}</p>
            <div className="border-t border-dashed border-gray-400 my-2" />
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-400">
                  <th className="text-left py-1">Soin</th>
                  {tpl.show_date && <th className="text-center py-1">Date</th>}
                  {tpl.show_indice && <th className="text-center py-1">Indice</th>}
                  {tpl.show_quantity && <th className="text-right py-1">Qté</th>}
                  {tpl.show_unit_price && <th className="text-right py-1">Prix unit.</th>}
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.careId} className="border-b border-gray-200">
                    <td className="py-1">{l.name}</td>
                    {tpl.show_date && <td className="text-center py-1">{new Date().toLocaleDateString("fr-FR")}</td>}
                    {tpl.show_indice && <td className="text-center py-1 font-semibold">{l.cotation || "—"}</td>}
                    {tpl.show_quantity && <td className="text-right py-1">{l.qty}</td>}
                    {tpl.show_unit_price && <td className="text-right py-1">{fcfa(Number(l.price) || 0)}</td>}
                    <td className="text-right py-1">{fcfa((Number(l.price) || 0) * l.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-dashed border-gray-400 my-2" />
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span>Sous-total</span><span>{fcfa(subtotal)}</span></div>
              {tpl.show_discount && <div className="flex justify-between"><span>Remise</span><span>−{fcfa(discountValue)}</span></div>}
              <div className="flex justify-between font-bold"><span>Total</span><span>{fcfa(total)}</span></div>
              {tpl.show_advance && <div className="flex justify-between"><span>Avance</span><span>{fcfa(advanceValue)}</span></div>}
              <div className="flex justify-between font-bold"><span>Reste à payer</span><span>{fcfa(reste)}</span></div>
            </div>
            {tpl.legal_footer?.trim() && (
              <div className="mt-4 border-t border-dashed border-gray-400 pt-2 text-center text-[10px] leading-relaxed whitespace-pre-line">
                {tpl.legal_footer}
              </div>
            )}
            <div className="border-t border-dashed border-gray-400 my-2" />
            <div className="flex justify-between items-end text-xs mt-4">
              <span>{template?.footer_text?.trim() || "Merci de votre visite."}</span>
              {tpl.show_stamp && <span className="w-[120px] border-t border-black pt-1 text-center">Cachet / Signature</span>}
            </div>
          </div>
        </div>
      </div>
    )}

    {showAllCares && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(11, 31, 42, 0.6)" }}
        onClick={() => setShowAllCares(false)}
      >
        <div
          className="card flex max-h-[85vh] w-full max-w-2xl flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="no-print mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-ink">Tous les soins</h3>
            <button
              type="button"
              onClick={() => setShowAllCares(false)}
              className="btn-secondary"
              style={{ height: 40, padding: "0 16px" }}
            >
              Fermer
            </button>
          </div>
          <input
            className="in"
            placeholder="Rechercher un soin…"
            value={careSearch}
            onChange={(e) => setCareSearch(e.target.value)}
            autoFocus
          />
          <div className="mt-3 max-h-[55vh] overflow-auto pr-1">
            {(() => {
              const term = careSearch.trim().toLowerCase();
              const matches = sortedCares.filter((c) => c.name.toLowerCase().includes(term));
              const groups = [
                ...effectiveCategories.filter((c) => c.active).map((c) => ({ slug: c.slug, name: c.name })),
                { slug: "__autres__", name: "Autres" },
              ];
              const rendered = groups
                .map((group) => ({
                  ...group,
                  items: matches.filter((c) =>
                    group.slug === "__autres__"
                      ? !effectiveCategories.some((g) => g.slug === (c.category ?? "intervention"))
                      : (c.category ?? "intervention") === group.slug,
                  ),
                }))
                .filter((group) => group.items.length > 0);
              return rendered.length === 0 ? (
                <p className="text-sm text-muted">Aucun soin ne correspond à la recherche.</p>
              ) : (
                rendered.map((group) => (
                  <div key={group.slug} className="mb-3">
                    <h4 className="mb-1 text-xs font-extrabold uppercase tracking-wide text-muted">{group.name}</h4>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {group.items.map((care) => (
                        <label
                          key={care.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-ink hover:bg-bg"
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(care.id)}
                            onChange={() => toggleCare(care.id)}
                            className="h-4 w-4 shrink-0 accent-accent"
                          />
                          <span className="truncate">
                            {favoriteRank(care) !== Number.MAX_SAFE_INTEGER && <span className="text-accent">★ </span>}
                            {care.name}
                          </span>
                          <span className="ml-auto shrink-0 text-xs text-muted">{fcfa(care.price)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              );
            })()}
          </div>
          <div className="no-print mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-sm text-muted">
              {selected.length} soin{selected.length > 1 ? "s" : ""} sélectionné{selected.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => {
                addSelected();
                setShowAllCares(false);
              }}
              className="go"
              style={{ height: 42, width: "auto", padding: "0 20px", borderRadius: 12, fontSize: 14 }}
            >
              Ajouter à la facture
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
