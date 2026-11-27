"use client";

import Link from "next/link";
import { useState } from "react";

type Kind = "ticket" | "facture" | "ordonnance";
type InvoiceColumn = { key: string; label: string; source: string; visible: boolean; span: number };
type InvoiceSettings = {
  title: string;
  number_prefix: string;
  show_date: boolean;
  show_indice: boolean;
  show_quantity: boolean;
  show_unit_price: boolean;
  show_discount: boolean;
  show_advance: boolean;
  show_stamp: boolean;
  merge_rows: boolean;
  columns: InvoiceColumn[];
  extra_rows: string[];
};
type Template = { kind: Kind; header_text: string | null; footer_text: string | null; settings?: Partial<InvoiceSettings> | null };
type InvoiceTemplateRow = { id: string; name: string; settings: Record<string, unknown>; is_default: boolean };
type Structure = {
  name: string;
  address: string;
  phone: string;
  header_text: string;
  paper_width_mm: number;
  print_format: string;
  logo_path: string;
};

const KINDS: { kind: Kind; label: string; title: string }[] = [
  { kind: "ticket", label: "Ticket", title: "TICKET" },
  { kind: "facture", label: "Facture", title: "FACTURE" },
  { kind: "ordonnance", label: "Ordonnance", title: "ORDONNANCE" },
];

const DEFAULT_TEMPLATES: Record<Kind, { header_text: string; footer_text: string }> = {
  ticket: { header_text: "Merci de votre visite", footer_text: "Cachet" },
  facture: { header_text: "Facture", footer_text: "Merci de votre confiance" },
  ordonnance: {
    header_text: "ORDONNANCE",
    footer_text: "Veuillez rapporter l’ordonnance au prochain rendez-vous !!!",
  },
};

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  title: "Facture",
  number_prefix: "",
  show_date: true,
  show_indice: true,
  show_quantity: true,
  show_unit_price: true,
  show_discount: true,
  show_advance: true,
  show_stamp: true,
  merge_rows: false,
  columns: [
    { key: "patient", label: "Patients", source: "patient", visible: true, span: 1 },
    { key: "date", label: "Date", source: "date", visible: true, span: 1 },
    { key: "dents", label: "Dents", source: "dents", visible: false, span: 1 },
    { key: "actes", label: "Actes", source: "label", visible: true, span: 1 },
    { key: "indice", label: "Indice", source: "cotation", visible: true, span: 1 },
    { key: "montant", label: "Montant", source: "total", visible: true, span: 1 },
  ],
  extra_rows: [],
};

const PRINT_FORMAT_LABELS: Record<string, string> = {
  "58": "Thermique 58 mm",
  "80": "Thermique 80 mm",
  a6: "A6",
};

export default function ImpressionClient({
  structure,
  templates,
  invoiceTemplates,
}: {
  structure: Structure;
  templates: Template[];
  invoiceTemplates: InvoiceTemplateRow[];
}) {
  const initial = (kind: Kind) => {
    const row = templates.find((t) => t.kind === kind);
    return {
      header_text: row?.header_text ?? DEFAULT_TEMPLATES[kind].header_text,
      footer_text: row?.footer_text ?? DEFAULT_TEMPLATES[kind].footer_text,
    };
  };

  const [active, setActive] = useState<Kind>("ticket");
  const [values, setValues] = useState(() => ({
    ticket: initial("ticket"),
    facture: initial("facture"),
    ordonnance: initial("ordonnance"),
  }));
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const firstTemplate = invoiceTemplates.find((t) => t.is_default) ?? invoiceTemplates[0] ?? null;
  const [invoiceTemplatesState, setInvoiceTemplatesState] = useState(invoiceTemplates);
  const [activeTemplateId, setActiveTemplateId] = useState(firstTemplate?.id ?? "");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [previewKind, setPreviewKind] = useState<Kind | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(() => ({
    ...DEFAULT_INVOICE_SETTINGS,
    ...((firstTemplate?.settings as Partial<InvoiceSettings>) ?? templates.find((t) => t.kind === "facture")?.settings ?? {}),
  }));

  const activeModel = KINDS.find((k) => k.kind === active)!;
  const current = values[active];

  const setField = (field: "header_text" | "footer_text", value: string) => {
    setValues((prev) => ({
      ...prev,
      [active]: { ...prev[active], [field]: value },
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/print-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: active,
          ...current,
          ...(active === "facture" ? { settings: invoiceSettings } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Enregistrement impossible." });
        return;
      }
      if (active === "facture") await saveInvoiceTemplate();
      setMessage({ ok: true, text: "Modèle enregistré." });
    } catch {
      setMessage({ ok: false, text: "Enregistrement impossible." });
    } finally {
      setSaving(false);
    }
  };

  const saveInvoiceTemplate = async () => {
    const res = await fetch("/api/invoice-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeTemplateId || undefined,
        name: activeTemplateId ? undefined : "Modèle par défaut",
        settings: invoiceSettings,
        is_default: !activeTemplateId,
      }),
    });
    if (!res.ok) throw new Error("template");
    if (!activeTemplateId) {
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      const created = { id: data.id ?? crypto.randomUUID(), name: "Modèle par défaut", settings: invoiceSettings as unknown as Record<string, unknown>, is_default: true };
      setInvoiceTemplatesState((prev) => [...prev, created]);
      setActiveTemplateId(created.id);
    } else {
      setInvoiceTemplatesState((prev) => prev.map((t) => (t.id === activeTemplateId ? { ...t, settings: invoiceSettings as unknown as Record<string, unknown> } : t)));
    }
  };

  const selectTemplate = (id: string) => {
    setActiveTemplateId(id);
    const tpl = invoiceTemplatesState.find((t) => t.id === id);
    if (tpl) setInvoiceSettings({ ...DEFAULT_INVOICE_SETTINGS, ...(tpl.settings as Partial<InvoiceSettings>) });
  };

  const createTemplate = async () => {
    if (!newTemplateName.trim()) return;
    const res = await fetch("/api/invoice-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTemplateName.trim(), settings: invoiceSettings, is_default: false }),
    });
    if (!res.ok) return;
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    setInvoiceTemplatesState((prev) => [...prev, { id: data.id ?? crypto.randomUUID(), name: newTemplateName.trim(), settings: invoiceSettings as unknown as Record<string, unknown>, is_default: false }]);
    setNewTemplateName("");
  };

  const setDefaultTemplate = async (id: string) => {
    const res = await fetch("/api/invoice-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_default: true }),
    });
    if (!res.ok) return;
    setInvoiceTemplatesState((prev) => prev.map((t) => ({ ...t, is_default: t.id === id })));
  };

  const deleteTemplate = async (id: string) => {
    const res = await fetch(`/api/invoice-templates?id=${id}`, { method: "DELETE" });
    if (!res.ok) return;
    const next = invoiceTemplatesState.filter((t) => t.id !== id);
    setInvoiceTemplatesState(next);
    if (activeTemplateId === id) {
      const first = next[0];
      setActiveTemplateId(first?.id ?? "");
      setInvoiceSettings({ ...DEFAULT_INVOICE_SETTINGS, ...((first?.settings as Partial<InvoiceSettings>) ?? {}) });
    }
  };

  const updateColumn = (index: number, patch: Partial<InvoiceColumn>) => {
    setInvoiceSettings((s) => ({
      ...s,
      columns: s.columns.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    setInvoiceSettings((s) => {
      const columns = [...s.columns];
      const target = index + direction;
      if (target < 0 || target >= columns.length) return s;
      [columns[index], columns[target]] = [columns[target], columns[index]];
      return { ...s, columns };
    });
  };

  const sampleRows = [
    { patient: "Cheikh Bamba GUYE", date: "31/08/2026", dents: "14", label: "Consultation", cotation: "D5", quantite: "1", prix_unitaire: "6 000 F", total: "6 000 F" },
    { patient: "Cheikh Bamba GUYE", date: "31/08/2026", dents: "14", label: "Radiographie", cotation: "D5", quantite: "1", prix_unitaire: "6 000 F", total: "6 000 F" },
    { patient: "Cheikh Bamba GUYE", date: "31/08/2026", dents: "14", label: "Couronne coulée", cotation: "D80", quantite: "1", prix_unitaire: "96 000 F", total: "96 000 F" },
  ];

  const formatLabel =
    PRINT_FORMAT_LABELS[structure.print_format] ?? structure.print_format ?? "80 mm";

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <div className="no-print flex flex-wrap gap-2">
        {KINDS.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => {
              setActive(item.kind);
              setMessage(null);
            }}
            className={active === item.kind ? "go" : "btn-secondary"}
            style={{ width: 170, height: 48, borderRadius: 14, fontSize: 15 }}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreviewKind(active)}
          className="btn-secondary"
          style={{ width: 170, height: 48, borderRadius: 14, fontSize: 15 }}
        >
          Aperçu · {activeModel.label}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-7 lg:flex-row">
        <section className="card no-print flex min-w-0 flex-1 flex-col gap-5">
          <div>
            <h2 className="text-lg font-extrabold">Modèle · {activeModel.label}</h2>
            <p className="mt-1 text-sm text-muted">
              Ces textes s’ajoutent à l’en-tête de la structure sur chaque document imprimé.
            </p>
          </div>

          <div>
            <label className="lbl" htmlFor="header_text">
              Texte du haut (en-tête)
            </label>
            <textarea
              id="header_text"
              className="in"
              maxLength={500}
              value={current.header_text}
              onChange={(e) => setField("header_text", e.target.value)}
              style={{ height: 110, padding: "12px 16px", resize: "vertical", lineHeight: 1.5 }}
            />
            <p className="mt-1 text-xs text-muted">{current.header_text.length}/500 caractères</p>
          </div>

          <div>
            <label className="lbl" htmlFor="footer_text">
              Texte du bas (pied de page)
            </label>
            <textarea
              id="footer_text"
              className="in"
              maxLength={500}
              value={current.footer_text}
              onChange={(e) => setField("footer_text", e.target.value)}
              style={{ height: 110, padding: "12px 16px", resize: "vertical", lineHeight: 1.5 }}
            />
            <p className="mt-1 text-xs text-muted">{current.footer_text.length}/500 caractères</p>
          </div>

          {active === "facture" && (
            <div className="rounded-[14px] border border-border bg-white p-4">
              <h3 className="text-sm font-extrabold">Modèle de facture</h3>
              <p className="mt-1 text-xs text-muted">Créez plusieurs modèles et choisissez celui utilisé par défaut.</p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1">
                  <label className="lbl" htmlFor="invoice-template">Modèle actif</label>
                  <select
                    id="invoice-template"
                    className="in"
                    value={activeTemplateId}
                    onChange={(e) => selectTemplate(e.target.value)}
                  >
                    {invoiceTemplatesState.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}{t.is_default ? " · par défaut" : ""}</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={() => void saveInvoiceTemplate()} className="btn-secondary" style={{ height: 44, padding: "0 16px", borderRadius: 12, fontSize: 13 }}>
                  Enregistrer le modèle
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {invoiceTemplatesState.map((t) => (
                  <span key={t.id} className="flex items-center gap-1 rounded-full bg-bg px-2 py-1 text-[11px] font-bold">
                    {t.name}
                    {!t.is_default && (
                      <button type="button" onClick={() => void setDefaultTemplate(t.id)} className="text-accent underline">Utiliser</button>
                    )}
                    <button type="button" onClick={() => void deleteTemplate(t.id)} className="text-danger">×</button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <input
                  className="in"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Nom du nouveau modèle"
                  style={{ flex: 1, minWidth: 180 }}
                />
                <button type="button" onClick={() => void createTemplate()} className="btn-secondary" style={{ height: 44, padding: "0 16px", borderRadius: 12, fontSize: 13 }}>
                  + Nouveau modèle
                </button>
              </div>
            </div>
          )}

          {active === "facture" && (
            <div className="rounded-[14px] border border-border bg-white p-4">
              <h3 className="text-sm font-extrabold">Colonnes du tableau</h3>
              <p className="mt-1 text-xs text-muted">Ordre, libellé, source et fusion des colonnes de la facture.</p>
              <div className="mt-3 space-y-2">
                {invoiceSettings.columns.map((col, i) => (
                  <div key={col.key} className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={(e) => updateColumn(i, { visible: e.target.checked })}
                      className="h-4 w-4 accent-accent"
                    />
                    <input
                      className="in"
                      value={col.label}
                      onChange={(e) => updateColumn(i, { label: e.target.value })}
                      style={{ width: 120, height: 38, padding: "0 10px", fontSize: 13 }}
                    />
                    <select
                      className="in"
                      value={col.source}
                      onChange={(e) => updateColumn(i, { source: e.target.value })}
                      style={{ width: 140, height: 38, padding: "0 10px", fontSize: 13 }}
                    >
                      <option value="patient">Patient</option>
                      <option value="date">Date</option>
                      <option value="dents">Dents</option>
                      <option value="label">Acte / soin</option>
                      <option value="cotation">Indice / Cotation</option>
                      <option value="quantite">Quantité</option>
                      <option value="prix_unitaire">Prix unitaire</option>
                      <option value="total">Montant</option>
                      <option value="texte">Texte libre</option>
                    </select>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-muted">
                      <input
                        type="checkbox"
                        checked={col.span > 1}
                        onChange={(e) => updateColumn(i, { span: e.target.checked ? 2 : 1 })}
                        className="h-4 w-4 accent-accent"
                      />
                      Fusionner
                    </label>
                    <button type="button" onClick={() => moveColumn(i, -1)} className="btn-secondary" style={{ width: 32, height: 32 }}>↑</button>
                    <button type="button" onClick={() => moveColumn(i, 1)} className="btn-secondary" style={{ width: 32, height: 32 }}>↓</button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setInvoiceSettings((s) => ({ ...s, columns: [...s.columns, { key: `custom-${Date.now()}`, label: "Nouvelle colonne", source: "texte", visible: true, span: 1 }] }))}
                className="btn-secondary mt-3"
                style={{ height: 36, padding: "0 14px", borderRadius: 10, fontSize: 12 }}
              >
                + Ajouter une colonne
              </button>
              <label className="mt-3 flex items-center gap-2 text-[13px] font-semibold">
                <input
                  type="checkbox"
                  checked={invoiceSettings.merge_rows}
                  onChange={(e) => setInvoiceSettings((s) => ({ ...s, merge_rows: e.target.checked }))}
                  className="h-4 w-4 accent-accent"
                />
                Fusionner les cellules identiques (patient / date sur plusieurs actes)
              </label>
              <div className="mt-3">
                <label className="lbl" htmlFor="invoice-extra-rows">Lignes de texte supplémentaires (une par ligne)</label>
                <textarea
                  id="invoice-extra-rows"
                  className="in"
                  value={invoiceSettings.extra_rows.join("\n")}
                  onChange={(e) => setInvoiceSettings((s) => ({ ...s, extra_rows: e.target.value.split("\n") }))}
                  style={{ height: 80, padding: "10px 12px", resize: "vertical", lineHeight: 1.4 }}
                />
              </div>
            </div>
          )}

          {active === "facture" && (
            <div className="rounded-[14px] border border-border bg-white p-4">
              <h3 className="text-sm font-extrabold">Personnalisation de la facture</h3>
              <p className="mt-1 text-xs text-muted">
                Numérotation et éléments affichés sur les factures imprimées.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="lbl" htmlFor="invoice-title">Titre du document</label>
                  <input
                    id="invoice-title"
                    className="in"
                    maxLength={80}
                    value={invoiceSettings.title}
                    onChange={(e) => setInvoiceSettings((s) => ({ ...s, title: e.target.value }))}
                    placeholder="Facture"
                  />
                </div>
                <div>
                  <label className="lbl" htmlFor="invoice-prefix">Préfixe du numéro</label>
                  <input
                    id="invoice-prefix"
                    className="in"
                    maxLength={20}
                    value={invoiceSettings.number_prefix}
                    onChange={(e) => setInvoiceSettings((s) => ({ ...s, number_prefix: e.target.value }))}
                    placeholder="Ex. F-"
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {([
                  ["show_date", "Colonne Date"],
                  ["show_indice", "Colonne Indice / Cotation"],
                  ["show_quantity", "Colonne Quantité"],
                  ["show_unit_price", "Colonne Prix unitaire"],
                  ["show_discount", "Ligne Remise"],
                  ["show_advance", "Ligne Avance"],
                  ["show_stamp", "Cachet / Signature"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={invoiceSettings[key]}
                      onChange={(e) => setInvoiceSettings((s) => ({ ...s, [key]: e.target.checked }))}
                      className="h-4 w-4 accent-accent"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {message && (
            <p className={message.ok ? "text-sm font-semibold text-accent" : "text-sm font-semibold text-danger"}>
              {message.text}
            </p>
          )}

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="go mt-auto"
            style={{ height: 56 }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-7 lg:w-[440px]">
          <section className="card no-print flex flex-col gap-3.5">
            <h2 className="text-lg font-extrabold">Réglages imprimante</h2>
            <p className="text-sm text-muted">
              Ces réglages sont lecture seule ici. Pour les modifier, allez dans Réglages.
            </p>

            <div className="ln">
              <span className="text-sm font-semibold text-muted">Largeur du papier</span>
              <span className="text-sm font-bold">{structure.paper_width_mm} mm</span>
            </div>
            <div className="ln">
              <span className="text-sm font-semibold text-muted">Format</span>
              <span className="text-sm font-bold">{formatLabel}</span>
            </div>
            <div className="ln">
              <span className="text-sm font-semibold text-muted">Logo</span>
              <span className="text-sm font-bold">{structure.logo_path ? "Oui" : "Non"}</span>
            </div>

            <div className="mt-1 flex flex-wrap gap-2">
              <Link href="/reglages" className="btn-secondary text-sm">
                Réglages
              </Link>
              <Link href="/aide-impression" className="btn-secondary text-sm">
                Aide à l’impression
              </Link>
            </div>
          </section>

          <section className="card flex flex-1 flex-col gap-3.5">
            <div className="text-xs font-bold uppercase tracking-[1px] text-muted">
              Aperçu · {activeModel.label}
            </div>

            <div className="text-sm leading-relaxed">
              <b className="text-base">{structure.name || "Nom de la structure"}</b>
              <br />
              {structure.address || "—"}
              <br />
              Tél. {structure.phone || "—"}
              <br />
              {(active === "facture" ? current.header_text : structure.header_text) || "—"}
            </div>

            <div className="border-t-2 border-dashed border-input-border" />

            <div className="text-center text-[18px] font-extrabold tracking-[2px]">
              {active === "facture" ? invoiceSettings.title : current.header_text || activeModel.title}
            </div>
            {active === "facture" && (
              <div className="text-center text-xs font-bold text-muted">
                N° {invoiceSettings.number_prefix}{new Date().getFullYear()}-0001
              </div>
            )}

            <div className="text-sm leading-relaxed">
              {active === "ordonnance" ? (
                <>
                  <b>1.</b> Paracétamol 500 mg · 1×3/jour · 5 jours
                  <br />
                  <b>2.</b> Amoxicilline 500 mg · 2×2/jour · 7 jours
                </>
              ) : (
                <>
                  <b>1.</b> Consultation · 1 × 5 000 F
                  <br />
                  <b>Total</b> · 5 000 F
                </>
              )}
            </div>

            <div className="mt-auto pt-3 text-center text-xs font-semibold text-muted">
              {current.footer_text || "—"}
            </div>

            <div className="border-t border-border pt-3">
              <div className="mb-1 text-xs font-bold uppercase tracking-[1px] text-muted">
                Les trois modèles
              </div>
              {KINDS.map((item) => (
                <p key={item.kind} className="text-xs leading-relaxed text-muted">
                  <b className="text-ink">{item.label} :</b> {values[item.kind].header_text || "—"} /{" "}
                  {values[item.kind].footer_text || "—"}
                </p>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {previewKind && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-auto p-4"
          style={{ background: "rgba(11,31,42,0.6)" }}
          onClick={() => setPreviewKind(null)}
        >
          <div className="card w-full max-w-[820px]" onClick={(e) => e.stopPropagation()}>
            <div className="no-print mb-3 flex items-center justify-between">
              <h3 className="text-lg font-extrabold">Aperçu · {KINDS.find((k) => k.kind === previewKind)?.label}</h3>
              <button type="button" onClick={() => setPreviewKind(null)} className="btn-secondary" style={{ height: 40, padding: "0 16px" }}>
                Fermer
              </button>
            </div>
            <div className="mx-auto bg-white p-6 text-[#0B1F2A]" style={{ maxWidth: 700, fontFamily: "Arial, Helvetica, sans-serif" }}>
              <div className="text-center">
                <b className="text-base">{structure.name || "Nom de la structure"}</b>
                <br />
                <span className="text-xs">{structure.address || "—"}</span>
                <br />
                <span className="text-xs">Tél. {structure.phone || "—"}</span>
                {values[previewKind].header_text && <p className="mt-1 text-xs">{values[previewKind].header_text}</p>}
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="text-center font-extrabold tracking-[2px]" style={{ fontSize: 18 }}>
                {previewKind === "facture" ? invoiceSettings.title : values[previewKind].header_text || KINDS.find((k) => k.kind === previewKind)?.title}
              </div>
              {previewKind === "facture" && (
                <div className="text-center text-xs font-bold text-muted">
                  N° {invoiceSettings.number_prefix}{new Date().getFullYear()}-0001
                </div>
              )}

              {previewKind === "ordonnance" ? (
                <div className="mt-4 space-y-2 text-sm">
                  <p><b>1.</b> Paracétamol 500 mg · 1×3/jour · 5 jours</p>
                  <p><b>2.</b> Amoxicilline 500 mg · 2×2/jour · 7 jours</p>
                </div>
              ) : previewKind === "ticket" ? (
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Consultation</span><span>5 000 F</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>5 000 F</span></div>
                </div>
              ) : (
                <>
                  <div className="mt-3 text-sm"><b>Patient :</b> Cheikh Bamba GUYE</div>
                  <table className="mt-3 w-full border-collapse border border-black text-xs">
                    <thead>
                      <tr>
                        {invoiceSettings.columns.filter((c) => c.visible).map((c) => (
                          <th key={c.key} className="border border-black px-2 py-1 text-center" colSpan={c.span}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleRows.map((row, i) => (
                        <tr key={i}>
                          {invoiceSettings.columns.filter((c) => c.visible).map((c) => {
                            const rowSpan = invoiceSettings.merge_rows && (c.source === "patient" || c.source === "date") && i > 0 ? 0 : 1;
                            if (rowSpan === 0) return null;
                            return (
                              <td key={c.key} className="border border-black px-2 py-1" colSpan={c.span} rowSpan={invoiceSettings.merge_rows && (c.source === "patient" || c.source === "date") ? sampleRows.length : 1}>
                                {(row as Record<string, string>)[c.source] ?? "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {invoiceSettings.extra_rows.filter(Boolean).map((line, i) => (
                    <p key={i} className="mt-2 text-xs italic">{line}</p>
                  ))}
                  <div className="mt-3 flex justify-between font-bold"><span>TOTAL</span><span>108 000 F</span></div>
                </>
              )}

              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="mt-3 text-center text-xs font-semibold text-muted">
                {values[previewKind].footer_text || "—"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
