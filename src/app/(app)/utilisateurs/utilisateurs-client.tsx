"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createUser,
  toggleUserActive,
  updateUser,
  resetUserPassword,
  type UserState,
} from "@/app/actions/users";

type User = {
  id: string;
  full_name: string | null;
  role: string;
  active: boolean;
  email: string;
};

const roleLabel: Record<string, string> = {
  structure_admin: "Administrateur",
  cashier: "Caissier",
  docteur: "Docteur",
  platform_admin: "Admin plateforme",
};

const fieldStyle = { height: 38, fontSize: 14, borderRadius: 10, padding: "0 12px" };
const smallBtn = { height: 34, padding: "0 14px", borderRadius: 10, fontSize: 12, width: "auto" };

export default function UtilisateursClient({ users }: { users: User[] }) {
  const [state, action, pending] = useActionState<UserState, FormData>(createUser, undefined);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="card">
        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-base font-bold text-ink">Comptes</h2>
            <p className="text-xs text-muted">Gérez les comptes de votre structure (caissiers, administrateurs).</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setEditingId(null); setResetId(null); }}
            className="btn-secondary text-xs"
            style={smallBtn}
          >
            {showForm ? "Annuler" : "Ajouter un compte"}
          </button>
        </div>

        {showForm && (
          <form action={action} className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <div>
              <label className="lbl !mb-1 !text-xs" htmlFor="full_name">Nom et prénom</label>
              <input id="full_name" name="full_name" required className="input" style={fieldStyle} />
              {state?.errors?.full_name && (
                <p className="mt-1 text-xs text-danger">{state.errors.full_name}</p>
              )}
            </div>
            <div>
              <label className="lbl !mb-1 !text-xs" htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" required className="input" style={fieldStyle} />
              {state?.errors?.email && (
                <p className="mt-1 text-xs text-danger">{state.errors.email}</p>
              )}
            </div>
            <div>
              <label className="lbl !mb-1 !text-xs" htmlFor="password">Mot de passe</label>
              <input id="password" name="password" type="password" required className="input" style={fieldStyle} />
              {state?.errors?.password && (
                <p className="mt-1 text-xs text-danger">{state.errors.password}</p>
              )}
            </div>
            <div>
              <label className="lbl !mb-1 !text-xs" htmlFor="role">Rôle</label>
              <select id="role" name="role" required className="input" style={fieldStyle} defaultValue="cashier">
                <option value="cashier">Caissier (tickets)</option>
                <option value="docteur">Docteur (lecture)</option>
                <option value="structure_admin">Administrateur de structure</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 md:col-span-2">
              {state?.message && (
                <p className={`mr-auto text-xs ${state.success ? "text-accent" : "text-danger"}`}>
                  {state.message}
                </p>
              )}
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs" style={smallBtn}>
                Annuler
              </button>
              <button type="submit" disabled={pending} className="btn-primary text-xs" style={smallBtn}>
                {pending ? "Création…" : "Créer le compte"}
              </button>
            </div>
          </form>
        )}

        {users.length === 0 ? (
          <p className="text-sm text-muted">Aucun utilisateur.</p>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 text-sm">
                    <span className="font-semibold text-ink">{u.full_name || "—"}</span>
                    <span className="mx-1.5 text-border">·</span>
                    <span className="text-muted">{u.email}</span>
                    <span className="mx-1.5 text-border">·</span>
                    <span className="text-muted">{roleLabel[u.role] ?? u.role}</span>
                    {!u.active && <span className="ml-2 text-xs font-semibold text-danger">(désactivé)</span>}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setEditingId(editingId === u.id ? null : u.id); setResetId(null); }}
                      className="btn-secondary text-xs"
                      style={smallBtn}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => { setResetId(resetId === u.id ? null : u.id); setEditingId(null); }}
                      className="btn-secondary text-xs"
                      style={smallBtn}
                    >
                      Mot de passe
                    </button>
                    <form action={toggleUserActive}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="hidden" name="active" value={u.active ? "false" : "true"} />
                      <button
                        type="submit"
                        className={u.active ? "btn-danger-solid" : "btn-secondary"}
                        style={{ height: 34, padding: "0 12px", borderRadius: 10, fontSize: 12, width: "auto" }}
                      >
                        {u.active ? "Désactiver" : "Réactiver"}
                      </button>
                    </form>
                  </div>
                </div>

                {editingId === u.id && (
                  <EditUserForm user={u} onClose={() => setEditingId(null)} />
                )}
                {resetId === u.id && (
                  <ResetPasswordForm userId={u.id} onClose={() => setResetId(null)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditUserForm({ user, onClose }: { user: User; onClose: () => void }) {
  const [state, action, pending] = useActionState<UserState, FormData>(updateUser, undefined);
  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);
  return (
    <form action={action} className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 md:grid-cols-2">
      <input type="hidden" name="user_id" value={user.id} />
      <div>
        <label className="lbl !mb-1 !text-xs" htmlFor={`name-${user.id}`}>Nom et prénom</label>
        <input id={`name-${user.id}`} name="full_name" defaultValue={user.full_name ?? ""} required className="input" style={fieldStyle} />
        {state?.errors?.full_name && <p className="mt-1 text-xs text-danger">{state.errors.full_name}</p>}
      </div>
      <div>
        <label className="lbl !mb-1 !text-xs" htmlFor={`email-${user.id}`}>E-mail</label>
        <input id={`email-${user.id}`} name="email" type="email" defaultValue={user.email} required className="input" style={fieldStyle} />
        {state?.errors?.email && <p className="mt-1 text-xs text-danger">{state.errors.email}</p>}
      </div>
      <div className="flex items-center justify-end gap-2 md:col-span-2">
        {state?.message && (
          <p className={`mr-auto text-xs ${state.success ? "text-accent" : "text-danger"}`}>{state.message}</p>
        )}
        <button type="button" onClick={onClose} className="btn-secondary text-xs" style={smallBtn}>Annuler</button>
        <button type="submit" disabled={pending} className="btn-primary text-xs" style={smallBtn}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [state, action, pending] = useActionState<UserState, FormData>(resetUserPassword, undefined);
  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);
  return (
    <form action={action} className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 md:grid-cols-2">
      <input type="hidden" name="user_id" value={userId} />
      <div>
        <label className="lbl !mb-1 !text-xs" htmlFor={`pwd-${userId}`}>Nouveau mot de passe</label>
        <input id={`pwd-${userId}`} name="password" type="password" required className="input" style={fieldStyle} />
        {state?.errors?.password && <p className="mt-1 text-xs text-danger">{state.errors.password}</p>}
      </div>
      <div className="flex items-center justify-end gap-2 md:col-span-2">
        {state?.message && (
          <p className={`mr-auto text-xs ${state.success ? "text-accent" : "text-danger"}`}>{state.message}</p>
        )}
        <button type="button" onClick={onClose} className="btn-secondary text-xs" style={smallBtn}>Annuler</button>
        <button type="submit" disabled={pending} className="btn-primary text-xs" style={smallBtn}>
          {pending ? "Réinitialisation…" : "Réinitialiser"}
        </button>
      </div>
    </form>
  );
}
