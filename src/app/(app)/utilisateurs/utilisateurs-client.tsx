"use client";

import { useActionState, useState } from "react";
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

export default function UtilisateursClient({ users }: { users: User[] }) {
  const [state, action, pending] = useActionState<UserState, FormData>(
    createUser,
    undefined,
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#0B1F2A]">Comptes</h2>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-secondary text-sm"
          >
            {showForm ? "Annuler" : "Ajouter un compte"}
          </button>
        </div>

        {showForm && (
          <form action={action} className="space-y-3 mb-6 border-t border-[#E2EAEF] pt-4">
            <div>
              <label className="lbl" htmlFor="full_name">Nom et prénom</label>
              <input id="full_name" name="full_name" required className="input" />
              {state?.errors?.full_name && (
                <p className="text-[#DC2626] text-sm mt-2">{state.errors.full_name}</p>
              )}
            </div>
            <div>
              <label className="lbl" htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" required className="input" />
              {state?.errors?.email && (
                <p className="text-[#DC2626] text-sm mt-2">{state.errors.email}</p>
              )}
            </div>
            <div>
              <label className="lbl" htmlFor="password">Mot de passe</label>
              <input id="password" name="password" type="password" required className="input" />
              {state?.errors?.password && (
                <p className="text-[#DC2626] text-sm mt-2">{state.errors.password}</p>
              )}
            </div>
            <div>
              <label className="lbl" htmlFor="role">Rôle</label>
              <select id="role" name="role" required className="input" defaultValue="cashier">
                <option value="cashier">Caissier (tickets)</option>
                <option value="docteur">Docteur (lecture)</option>
                <option value="structure_admin">Administrateur de structure</option>
              </select>
            </div>
            {state?.message && (
              <p className={state.success ? "text-[#0B7A6B] text-sm" : "text-[#DC2626] text-sm"}>
                {state.message}
              </p>
            )}
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? "Création…" : "Créer le compte"}
            </button>
          </form>
        )}

        {users.length === 0 ? (
          <p className="text-[#4B5F6B] text-sm">Aucun utilisateur.</p>
        ) : (
          <ul className="divide-y divide-[#E2EAEF]">
            {users.map((u) => (
              <li key={u.id} className="py-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#0B1F2A]">
                      {u.full_name || "—"}
                      {!u.active && <span className="ml-2 text-xs text-[#DC2626]">(désactivé)</span>}
                    </p>
                    <p className="text-xs text-[#4B5F6B]">{u.email}</p>
                    <p className="text-xs text-[#4B5F6B]">{roleLabel[u.role] ?? u.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === u.id ? null : u.id)}
                      className="btn-secondary text-xs"
                      style={{ height: 32, padding: "0 12px", borderRadius: 10 }}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetId(resetId === u.id ? null : u.id)}
                      className="btn-secondary text-xs"
                      style={{ height: 32, padding: "0 12px", borderRadius: 10 }}
                    >
                      Mot de passe
                    </button>
                    <form action={toggleUserActive}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="hidden" name="active" value={u.active ? "false" : "true"} />
                      <button
                        type="submit"
                        className="text-sm font-medium text-[#4B5F6B] hover:underline"
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
  return (
    <form action={action} className="space-y-3 border-t border-[#E2EAEF] pt-3">
      <input type="hidden" name="user_id" value={user.id} />
      <div>
        <label className="lbl" htmlFor={`name-${user.id}`}>Nom et prénom</label>
        <input
          id={`name-${user.id}`}
          name="full_name"
          defaultValue={user.full_name ?? ""}
          required
          className="input"
        />
        {state?.errors?.full_name && (
          <p className="text-[#DC2626] text-sm mt-2">{state.errors.full_name}</p>
        )}
      </div>
      <div>
        <label className="lbl" htmlFor={`email-${user.id}`}>E-mail</label>
        <input
          id={`email-${user.id}`}
          name="email"
          type="email"
          defaultValue={user.email}
          required
          className="input"
        />
        {state?.errors?.email && (
          <p className="text-[#DC2626] text-sm mt-2">{state.errors.email}</p>
        )}
      </div>
      {state?.message && (
        <p className={state.success ? "text-[#0B7A6B] text-sm" : "text-[#DC2626] text-sm"}>
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary" style={{ height: 40, borderRadius: 10 }}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary" style={{ height: 40, borderRadius: 10 }}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [state, action, pending] = useActionState<UserState, FormData>(resetUserPassword, undefined);
  return (
    <form action={action} className="space-y-3 border-t border-[#E2EAEF] pt-3">
      <input type="hidden" name="user_id" value={userId} />
      <div>
        <label className="lbl" htmlFor={`pwd-${userId}`}>Nouveau mot de passe</label>
        <input
          id={`pwd-${userId}`}
          name="password"
          type="password"
          required
          className="input"
        />
        {state?.errors?.password && (
          <p className="text-[#DC2626] text-sm mt-2">{state.errors.password}</p>
        )}
      </div>
      {state?.message && (
        <p className={state.success ? "text-[#0B7A6B] text-sm" : "text-[#DC2626] text-sm"}>
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary" style={{ height: 40, borderRadius: 10 }}>
          {pending ? "Réinitialisation…" : "Réinitialiser"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary" style={{ height: 40, borderRadius: 10 }}>
          Annuler
        </button>
      </div>
    </form>
  );
}
