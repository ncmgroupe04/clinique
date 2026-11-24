"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function validate(password: string, confirm: string): string | null {
  if (password.length < 12) return "12 caractères minimum.";
  if (!/[A-Z]/.test(password)) return "Au moins une majuscule.";
  if (!/[a-z]/.test(password)) return "Au moins une minuscule.";
  if (!/[0-9]/.test(password)) return "Au moins un chiffre.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Au moins un caractère spécial.";
  if (password !== confirm) return "Les mots de passe ne correspondent pas.";
  return null;
}

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = new URLSearchParams(window.location.search).get("code");
    (async () => {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (hash.get("access_token") && hash.get("refresh_token")) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.get("access_token")!,
            refresh_token: hash.get("refresh_token")!,
          });
          if (error) throw error;
        } else {
          throw new Error("Lien invalide ou expiré.");
        }
        setReady(true);
      } catch {
        setError("Lien invalide ou expiré. Demandez un nouveau lien depuis la connexion.");
      }
    })();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validate(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError("Modification impossible. Demandez un nouveau lien.");
      return;
    }
    await supabase.auth.signOut();
    setDone(true);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="card relative z-10 w-full max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-ink">Nouveau mot de passe</h1>
        <p className="mb-6 text-sm text-muted">Choisissez un mot de passe sûr pour votre compte.</p>

        {done ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-accent-light p-3 text-sm font-semibold text-accent">
              Mot de passe modifié. Vous pouvez vous reconnecter.
            </p>
            <Link href="/connexion" className="btn-primary block w-full text-center">
              Aller à la connexion
            </Link>
          </div>
        ) : !ready && !error ? (
          <p className="text-sm text-muted">Vérification du lien…</p>
        ) : error && !ready ? (
          <div className="space-y-4">
            <p className="text-sm text-danger">{error}</p>
            <Link href="/connexion" className="btn-primary block w-full text-center">
              Demander un nouveau lien
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="lbl" htmlFor="new-password">Nouveau mot de passe <span className="text-danger">*</span></label>
              <input
                id="new-password"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="lbl" htmlFor="confirm-password">Confirmer le mot de passe <span className="text-danger">*</span></label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted">12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.</p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Enregistrement…" : "Enregistrer le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
