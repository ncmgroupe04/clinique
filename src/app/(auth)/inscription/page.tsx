"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupState } from "@/app/actions/auth";

export default function InscriptionPage() {
  const [state, action, pending] = useActionState<SignupState, FormData>(
    signup,
    undefined,
  );
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl font-bold text-[#0B1F2A] mb-2">
          Créer une structure
        </h1>
        <p className="text-sm text-[#4B5F6B] mb-6">
          Créez le compte administrateur de votre structure.
        </p>
        {state?.success && (
          <p className="text-[#0B7A6B] text-sm mb-4">{state.message}</p>
        )}
        <form action={action} className="space-y-6">
          <div>
            <label className="lbl" htmlFor="structureName">
              Nom de la structure
            </label>
            <input id="structureName" name="structureName" required className="input" />
            {state?.errors?.structureName && (
              <p className="text-[#DC2626] text-sm mt-2">{state.errors.structureName}</p>
            )}
          </div>
          <div>
            <label className="lbl" htmlFor="fullName">
              Votre nom et prénom
            </label>
            <input id="fullName" name="fullName" required className="input" />
            {state?.errors?.fullName && (
              <p className="text-[#DC2626] text-sm mt-2">{state.errors.fullName}</p>
            )}
          </div>
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
            <input id="password" name="password" type="password" required className="input" />
            {state?.errors?.password && (
              <p className="text-[#DC2626] text-sm mt-2">{state.errors.password}</p>
            )}
          </div>
          {state?.message && !state.success && (
            <p className="text-[#DC2626] text-sm">{state.message}</p>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Création…" : "Créer la structure"}
          </button>
        </form>
        <p className="text-sm text-[#4B5F6B] mt-6 text-center">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-[#0B7A6B] font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
