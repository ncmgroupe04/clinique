"use client";

import { useActionState } from "react";
import { updateSettings, type SettingsState } from "@/app/actions/settings";

type Defaults = {
  name: string;
  address: string;
  phone: string;
  header_text: string;
  paper_width_mm: number;
};

export default function ReglagesForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateSettings,
    undefined,
  );
  return (
    <form action={action} className="space-y-6">
      <div>
        <label className="lbl" htmlFor="name">
          Nom de la structure
        </label>
        <input id="name" name="name" defaultValue={defaults.name} required className="input" />
        {state?.errors?.name && (
          <p className="text-[#DC2626] text-sm mt-2">{state.errors.name}</p>
        )}
      </div>
      <div>
        <label className="lbl" htmlFor="address">
          Adresse
        </label>
        <input id="address" name="address" defaultValue={defaults.address} className="input" />
      </div>
      <div>
        <label className="lbl" htmlFor="phone">
          Téléphone
        </label>
        <input id="phone" name="phone" defaultValue={defaults.phone} className="input" />
      </div>
      <div>
        <label className="lbl" htmlFor="header_text">
          Texte d&apos;en-tête (autres infos)
        </label>
        <textarea
          id="header_text"
          name="header_text"
          defaultValue={defaults.header_text}
          rows={3}
          className="input"
        />
      </div>
      <div>
        <label className="lbl" htmlFor="paper_width_mm">
          Largeur du papier thermique
        </label>
        <select
          id="paper_width_mm"
          name="paper_width_mm"
          defaultValue={defaults.paper_width_mm}
          className="input"
        >
          <option value={80}>80 mm (par défaut)</option>
          <option value={58}>58 mm</option>
        </select>
      </div>
      {state?.message && (
        <p className={state.success ? "text-[#0B7A6B] text-sm" : "text-[#DC2626] text-sm"}>
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Enregistrement…" : "Enregistrer l'en-tête"}
      </button>
    </form>
  );
}