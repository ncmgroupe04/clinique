"use client";

import { useActionState, useState } from "react";
import { updateSettings, type SettingsState } from "@/app/actions/settings";
import LogoUpload from "./logo-upload";

type Defaults = {
  name: string;
  address: string;
  phone: string;
  header_text: string;
  paper_width_mm: number;
  structureId: string;
  logo_path: string;
};

export default function ReglagesForm({
  defaults,
  nextReceipt,
  dateLabel,
}: {
  defaults: Defaults;
  nextReceipt: { year: number; number: number };
  dateLabel: string;
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateSettings,
    undefined,
  );
  const [name, setName] = useState(defaults.name);
  const [address, setAddress] = useState(defaults.address);
  const [phone, setPhone] = useState(defaults.phone);
  const [contact, setContact] = useState(defaults.header_text);

  const receiptNumber = `${nextReceipt.year}-${String(nextReceipt.number).padStart(4, "0")}`;

  return (
    <div className="flex flex-1 flex-col items-stretch gap-7 lg:flex-row">
      <form action={action} className="card flex min-w-0 flex-1 flex-col gap-5">
        <div>
          <label className="lbl" htmlFor="name">
            Nom de la structure
          </label>
          <input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="in"
          />
          {state?.errors?.name && (
            <p className="mt-2 text-sm text-danger">{state.errors.name}</p>
          )}
        </div>

        <div>
          <label className="lbl" htmlFor="address">
            Adresse
          </label>
          <input
            id="address"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="in"
          />
        </div>

        <div>
          <label className="lbl" htmlFor="phone">
            Téléphone
          </label>
          <input
            id="phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="in"
          />
        </div>

        <LogoUpload structureId={defaults.structureId} initialPath={defaults.logo_path} />

        <div>
          <label className="lbl" htmlFor="header_text">
            Autres informations de contact
          </label>
          <input
            id="header_text"
            name="header_text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="in"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-[#F2F5F7] px-[18px] py-3.5 text-sm font-semibold">
          <span className="font-medium text-muted">Numérotation</span>
          <span>
            Automatique · Reçu {receiptNumber}, repart à 0001 chaque année
          </span>
        </div>

        {state?.message && (
          <p className={state.success ? "text-sm text-accent" : "text-sm text-danger"}>
            {state.message}
          </p>
        )}

        <input type="hidden" name="paper_width_mm" value={defaults.paper_width_mm} />

        <button
          type="submit"
          disabled={pending}
          className="go mt-auto"
          style={{ height: 56 }}
        >
          {pending ? "Enregistrement…" : "Enregistrer l’en-tête"}
        </button>
      </form>

      <aside className="w-full shrink-0 lg:w-[470px]">
        <section className="card flex h-full flex-col gap-3.5">
          <div className="text-xs font-bold uppercase tracking-[1px] text-muted">
            Aperçu sur l’ordonnance
          </div>

          <div className="flex justify-between gap-4 text-sm leading-relaxed">
            <div>
              <b className="text-base">{name || "Nom de la structure"}</b>
              <br />
              {address || "—"}
              <br />
              Tél. {phone || "—"}
              <br />
              {contact || "—"}
            </div>
            <div className="text-right font-semibold">
              N° {receiptNumber}
              <br />
              <span className="font-medium text-muted">{dateLabel}</span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-input-border" />

          <div
            className="my-1.5 text-center text-[22px] font-extrabold"
            style={{ letterSpacing: 4 }}
          >
            ORDONNANCE
          </div>

          <div className="text-sm leading-relaxed">
            <b>1.</b> Paracétamol 500 mg · 1×3/jour · 5 jours
            <br />
            <b>2.</b> Amoxicilline 500 mg · 2×2/jour · 7 jours
          </div>

          <div className="mt-auto text-xs text-muted">
            Gauche : la structure · Droite : numéro et date · Même en-tête sur le
            ticket
          </div>
        </section>
      </aside>
    </div>
  );
}
