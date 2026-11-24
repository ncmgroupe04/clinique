"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signup, login, type SignupState, type LoginState } from "@/app/actions/auth";

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 2l20 20M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 4.2-.8" />
    </svg>
  );
}

export default function AuthScreen({ initialMode }: { initialMode: "login" | "signup" }) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [name]: e.target.value }));

  const hint = (name: string): string | null => {
    const v = values[name] ?? "";
    if (!v) return null;
    if (name === "structureName" && v.trim().length < 2) return "2 caractères minimum.";
    if (name === "fullName" && v.trim().length < 3) return "3 caractères minimum.";
    if (name === "address" && v.trim().length < 5) return "5 caractères minimum.";
    if (name === "phone" && !/^\d{9}$/.test(v.trim())) return "Exactement 9 chiffres requis.";
    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Adresse e-mail invalide : le symbole @ est requis.";
    if (name === "password") {
      if (v.length < 8) return "8 caractères minimum.";
      if (!/[A-Z]/.test(v)) return "Au moins une majuscule.";
      if (!/[a-z]/.test(v)) return "Au moins une minuscule.";
      if (!/[0-9]/.test(v)) return "Au moins un chiffre.";
      if (!/[^A-Za-z0-9]/.test(v)) return "Au moins un caractère spécial.";
    }
    if (name === "confirmPassword" && v !== values.password) return "Les mots de passe ne correspondent pas.";
    return null;
  };
  const [signupState, signupAction, signupPending] = useActionState<SignupState, FormData>(signup, undefined);
  const [loginState, loginAction, loginPending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md">
        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={mode === "login" ? "go" : "btn-secondary"}
            style={{ height: 44, borderRadius: 12, fontSize: 13 }}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={mode === "signup" ? "go" : "btn-secondary"}
            style={{ height: 44, borderRadius: 12, fontSize: 13 }}
          >
            Créer ma Structure
          </button>
        </div>

        {mode === "login" ? (
          <>
            <h1 className="mb-2 text-2xl font-bold text-ink">Connexion</h1>
            <p className="mb-6 text-sm text-muted">Accédez à votre espace structure.</p>
            <form action={loginAction} className="space-y-5">
              <div>
                <label className="lbl" htmlFor="email">E-mail <span className="text-danger">*</span></label>
                <input id="email" name="email" type="email" required className="input" onChange={set("email")} />
                {hint("email") && <p className="mt-2 text-sm text-danger">{hint("email")}</p>}
                {loginState?.errors?.email && <p className="mt-2 text-sm text-danger">{loginState.errors.email}</p>}
              </div>
              <div>
                <label className="lbl" htmlFor="password">Mot de passe <span className="text-danger">*</span></label>
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? "text" : "password"} required className="input" style={{ paddingRight: 44 }} onChange={set("password")} />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-bg"
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
                {hint("password") && <p className="mt-2 text-sm text-danger">{hint("password")}</p>}
                {loginState?.errors?.password && <p className="mt-2 text-sm text-danger">{loginState.errors.password}</p>}
              </div>
              {loginState?.message && <p className="text-sm text-danger">{loginState.message}</p>}
              <button type="submit" disabled={loginPending} className="btn-primary w-full">
                {loginPending ? "Connexion…" : "Se connecter"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-bold text-ink">Créer une structure</h1>
            <p className="mb-6 text-sm text-muted">Créez le compte administrateur de votre structure.</p>
            {signupState?.success && <p className="mb-4 text-sm text-accent">{signupState.message}</p>}
            <form action={signupAction} className="space-y-5">
              <div>
                <label className="lbl" htmlFor="structureName">Nom de la structure <span className="text-danger">*</span></label>
                <input id="structureName" name="structureName" minLength={2} required className="input" onChange={set("structureName")} />
                {hint("structureName") && <p className="mt-2 text-sm text-danger">{hint("structureName")}</p>}
                {signupState?.errors?.structureName && <p className="mt-2 text-sm text-danger">{signupState.errors.structureName}</p>}
              </div>
              <div>
                <label className="lbl" htmlFor="fullName">Votre nom et prénom <span className="text-danger">*</span></label>
                <input id="fullName" name="fullName" minLength={3} required className="input" onChange={set("fullName")} />
                {hint("fullName") && <p className="mt-2 text-sm text-danger">{hint("fullName")}</p>}
                {signupState?.errors?.fullName && <p className="mt-2 text-sm text-danger">{signupState.errors.fullName}</p>}
              </div>
              <div>
                <label className="lbl" htmlFor="email">E-mail <span className="text-danger">*</span></label>
                <input id="email" name="email" type="email" required className="input" onChange={set("email")} />
                {hint("email") && <p className="mt-2 text-sm text-danger">{hint("email")}</p>}
                {signupState?.errors?.email && <p className="mt-2 text-sm text-danger">{signupState.errors.email}</p>}
              </div>
              <div>
                <label className="lbl" htmlFor="password">Mot de passe <span className="text-danger">*</span></label>
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? "text" : "password"} required className="input" style={{ paddingRight: 44 }} onChange={set("password")} />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-bg"
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
                {hint("password") && <p className="mt-2 text-sm text-danger">{hint("password")}</p>}
                {signupState?.errors?.password && <p className="mt-2 text-sm text-danger">{signupState.errors.password}</p>}
              </div>
              <div>
                <label className="lbl" htmlFor="confirmPassword">Confirmer le mot de passe <span className="text-danger">*</span></label>
                <div className="relative">
                  <input id="confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} required className="input" style={{ paddingRight: 44 }} />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Masquer la confirmation" : "Afficher la confirmation"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-bg"
                  >
                    <EyeIcon visible={showConfirm} />
                  </button>
                </div>
                {signupState?.errors?.confirmPassword && <p className="mt-2 text-sm text-danger">{signupState.errors.confirmPassword}</p>}
              </div>
              <div>
                <label className="lbl" htmlFor="address">Adresse <span className="text-danger">*</span></label>
                <input id="address" name="address" minLength={5} required className="input" placeholder="Quartier, ville" onChange={set("address")} />
                {hint("address") && <p className="mt-2 text-sm text-danger">{hint("address")}</p>}
                {signupState?.errors?.address && <p className="mt-2 text-sm text-danger">{signupState.errors.address}</p>}
              </div>
              <div>
                <label className="lbl" htmlFor="phone">Téléphone <span className="text-danger">*</span></label>
                <input id="phone" name="phone" minLength={9} maxLength={9} required className="input" placeholder="77 000 00 00" onChange={set("phone")} />
                {hint("phone") && <p className="mt-2 text-sm text-danger">{hint("phone")}</p>}
                {signupState?.errors?.phone && <p className="mt-2 text-sm text-danger">{signupState.errors.phone}</p>}
              </div>
              <div>
                <label className="lbl" htmlFor="headerText">Autres informations</label>
                <input id="headerText" name="headerText" className="input" placeholder="Informations complémentaires" />
              </div>
              {signupState?.message && !signupState.success && (
                <p className="text-sm text-danger">{signupState.message}</p>
              )}
              <button type="submit" disabled={signupPending} className="btn-primary w-full">
                {signupPending ? "Création…" : "Créer la structure"}
              </button>
            </form>
          </>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted">
          <Link href="/cgu" className="hover:text-accent hover:underline">CGU</Link>
          <span>·</span>
          <Link href="/confidentialite" className="hover:text-accent hover:underline">Confidentialité</Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-accent hover:underline">Cookies</Link>
        </div>
      </div>
    </main>
  );
}
