"use client";

import { useActionState, useState } from "react";
import {
  updateProfileName,
  changePassword,
  type ProfileState,
} from "@/app/actions/profile";
import { logout } from "@/app/actions/auth";
import { useFormStatus } from "react-dom";

function Btn({ label, pendingLabel = "…", className = "btn-secondary" }: { label: string; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} style={{ height: 40, borderRadius: 10, fontSize: 13, width: "auto", padding: "0 16px" }}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function ProfileActions({ fullName }: { fullName: string }) {
  const [panel, setPanel] = useState<"name" | "password" | null>(null);
  const [nameState, nameAction] = useActionState<ProfileState, FormData>(updateProfileName, undefined);
  const [pwdState, pwdAction] = useActionState<ProfileState, FormData>(changePassword, undefined);

  return (
    <div className="space-y-3">
      {panel === "name" ? (
        <form action={nameAction} className="space-y-2 rounded-xl border border-border p-3">
          <label className="lbl" htmlFor="profile-name">Nom et prénom</label>
          <input id="profile-name" name="full_name" defaultValue={fullName} minLength={3} required className="input" />
          {nameState?.message && <p className={`text-xs ${nameState.success ? "text-accent" : "text-danger"}`}>{nameState.message}</p>}
          <div className="flex gap-2">
            <Btn label="Enregistrer" className="btn-primary" />
            <button type="button" onClick={() => setPanel(null)} className="btn-secondary" style={{ height: 40, borderRadius: 10, fontSize: 13 }}>Annuler</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setPanel("name")} className="btn-edit-solid w-full" style={{ height: 40, borderRadius: 10, fontSize: 13, background: "#475569", color: "#fff" }}>
          Modifier le profil
        </button>
      )}

      {panel === "password" ? (
        <form action={pwdAction} className="space-y-2 rounded-xl border border-border p-3">
          <label className="lbl" htmlFor="profile-pwd">Nouveau mot de passe</label>
          <input id="profile-pwd" name="password" type="password" minLength={12} required className="input" />
          {pwdState?.message && <p className={`text-xs ${pwdState.success ? "text-accent" : "text-danger"}`}>{pwdState.message}</p>}
          <div className="flex gap-2">
            <Btn label="Changer" className="btn-primary" />
            <button type="button" onClick={() => setPanel(null)} className="btn-secondary" style={{ height: 40, borderRadius: 10, fontSize: 13 }}>Annuler</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setPanel("password")} className="btn-secondary w-full" style={{ height: 40, borderRadius: 10, fontSize: 13 }}>
          Changer le mot de passe
        </button>
      )}

      <form action={logout}>
        <Btn label="Se déconnecter" />
      </form>
    </div>
  );
}
