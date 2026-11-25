"use client";

import { logout } from "@/app/actions/auth";
import ConfirmActionButton from "./confirm-action-button";

export default function LogoutButton() {
  return (
    <ConfirmActionButton
      label="Déconnexion"
      confirmTitle="Se déconnecter ?"
      confirmMessage="Vous allez quitter votre session. Vous devrez vous reconnecter pour continuer."
      confirmLabel="Confirmer la déconnexion"
      formAction={logout}
      buttonClassName="nv nv-logout"
    >
      <svg className="logout-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
        <path d="M10 8l-4 4 4 4M6 12h9" />
      </svg>
      <span className="logout-label">Déconnexion</span>
    </ConfirmActionButton>
  );
}
