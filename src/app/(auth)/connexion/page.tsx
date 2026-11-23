"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "@/app/actions/auth";

export default function ConnexionPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl font-bold text-[#0B1F2A] mb-2">Connexion</h1>
        <p className="text-sm text-[#4B5F6B] mb-6">
          Accédez à votre espace structure.
        </p>
        <form action={action} className="space-y-6">
          <div>
            <label className="lbl" htmlFor="email">
              E-mail
            </label>
            <input id="email" name="email" type="email" required className="input" />
            {state?.errors?.email && (
              <p className="text-[#DC2626] text-sm mt-2">{state.errors.email}</p>
            )}
          </div>
          <div>
            <label className="lbl" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
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
            <p className="text-[#DC2626] text-sm">{state.message}</p>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <p className="text-sm text-[#4B5F6B] mt-6 text-center">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-[#0B7A6B] font-semibold hover:underline">
            Créer une structure
          </Link>
        </p>
      </div>
    </main>
  );
}
