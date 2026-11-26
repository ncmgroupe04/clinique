"use client";

import Link from "next/link";
import { useState } from "react";

type Kind = "ticket" | "facture" | "ordonnance";
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
};
type Template = { kind: Kind; header_text: string | null; footer_text: string | null; settings?: Partial<InvoiceSettings> | null };
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
};

const PRINT_FORMAT_LABELS: Record<string, string> = {
  "58": "Thermique 58 mm",
  "80": "Thermique 80 mm",
  a6: "A6",
};

export default function ImpressionClient({
  structure,
  templates,
}: {
  structure: Structure;
  templates: Template[];
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
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(() => ({
    ...DEFAULT_INVOICE_SETTINGS,
    ...(templates.find((t) => t.kind === "facture")?.settings ?? {}),
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
      setMessage({ ok: true, text: "Modèle enregistré." });
    } catch {
      setMessage({ ok: false, text: "Enregistrement impossible." });
    } finally {
      setSaving(false);
    }
  };

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
    </div>
  );
}
