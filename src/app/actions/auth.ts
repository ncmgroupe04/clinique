"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { STANDARD_INVOICE_SETTINGS } from "@/lib/invoice-defaults";
import {
  signupSchema,
  loginSchema,
  type SignupState,
  type LoginState,
} from "@/lib/validations/auth";

export type { SignupState, LoginState };

export type ResetState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { errors: { email: ["Adresse e-mail invalide."] } };
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ticketordonnance.vercel.app";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/mot-de-passe-modifier`,
  });
  if (error) {
    return { message: "Envoi impossible. Réessayez dans un instant." };
  }
  await logAudit({
    action: "password_reset_requested",
    details: { email },
  });
  // Réponse identique même si l'adresse est inconnue (pas d'énumération de comptes).
  return {
    success: true,
    message: "Si cette adresse est connue, un lien de réinitialisation vient de lui être envoyé.",
  };
}

export async function signup(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    structureName: formData.get("structureName"),
    fullName: formData.get("fullName"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    headerText: formData.get("headerText") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
    planId: formData.get("planId") ?? "",
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { email, password, structureName, fullName, address, phone, headerText, planId } = parsed.data;

  // Ne pas révéler si une adresse est déjà enregistrée : on laisse Supabase
  // gérer le cas (identités vides) et on renvoie un message générique.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ticketordonnance.vercel.app";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${siteUrl}/connexion` } });
  if (!error && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { message: "Si cette adresse est éligible, un lien de confirmation a été envoyé." };
  }
  if (error || !data.user) {
    return { message: "Inscription impossible. Réessayez dans un instant." };
  }

  const userId = data.user.id;

  // Create structure + profile using service role (bypasses RLS for bootstrap).
  try {
    const admin = createServiceClient();
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);
    const { data: structure, error: structError } = await admin
      .from("structures")
      .insert({
        name: structureName,
        address: address || null,
        phone: phone || null,
        header_text: headerText || null,
        active: true,
        registration_fee_paid: false,
        subscription_ends_at: trialEnds.toISOString(),
        // Essai gratuit : toutes les fonctionnalités sont débloquées (pas de plan
        // limitant, pas de quota) pendant les 7 jours d'essai.
        plan_id: null,
      })
      .select("id")
      .single();
    if (structError || !structure) throw structError ?? new Error("structure");

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      structure_id: structure.id,
      role: "structure_admin",
      full_name: fullName,
    });
    if (profileError) throw profileError;

    // Tableau de facture standard pour la nouvelle structure uniquement.
    // Les structures déjà inscrites ne sont jamais réécrites ici.
    const standardSettings = JSON.parse(JSON.stringify(STANDARD_INVOICE_SETTINGS));
    // La colonne `settings` n'existe que depuis la migration 0036 : on ignore
    // l'erreur si elle n'est pas encore appliquée, sans bloquer l'inscription.
    const printTemplate = await admin
      .from("print_templates")
      .upsert(
        {
          structure_id: structure.id,
          kind: "facture",
          header_text: "Facture",
          footer_text: "Merci de votre confiance",
          settings: standardSettings,
        },
        { onConflict: "structure_id,kind" },
      );
    if (printTemplate.error) console.warn("Modèle de facture standard non enregistré", printTemplate.error.message);

    const invoiceTemplate = await admin
      .from("invoice_templates")
      .insert({
        structure_id: structure.id,
        name: "Modèle par défaut",
        settings: standardSettings,
        is_default: true,
      });
    if (invoiceTemplate.error) console.warn("Modèle de facture standard non enregistré", invoiceTemplate.error.message);

    await logAudit({
      structureId: structure.id,
      userId,
      action: "signup",
      details: { email, plan_id: planId || null, structure: structureName },
    });

  } catch {
    return {
      message:
        "Compte créé mais la structure n'a pas pu être initialisée. Contactez le support.",
    };
  }

  if (!data.session) {
    return {
      success: true,
      message:
        "Compte créé. Vérifiez votre boîte mail pour confirmer l'adresse, puis connectez-vous.",
    };
  }
  redirect("/tableau");
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const supabase = await createClient();
  const email = parsed.data.email.toLowerCase();
  const admin = createServiceClient();

  // Anti force brute : 5 tentatives maximum par minute et par e-mail,
  // et 30 par minute et par adresse IP.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data: recent } = await admin
    .from("login_attempts")
    .select("id")
    .eq("email", email)
    .gte("created_at", since);
  if ((recent?.length ?? 0) >= 5) {
    return { message: "Trop de tentatives de connexion. Réessayez dans une minute." };
  }
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ??
    (await headers()).get("x-real-ip") ??
    null;
  if (ip) {
    const { data: recentIp } = await admin
      .from("login_attempts")
      .select("id")
      .eq("ip", ip)
      .gte("created_at", since);
    if ((recentIp?.length ?? 0) >= 30) {
      return { message: "Trop de tentatives de connexion. Réessayez dans une minute." };
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    await admin.from("login_attempts").insert({ email, ip });
    await logAudit({
      action: "login_failed",
      details: { reason: "invalid_credentials" },
    });
    console.error("[login] Supabase error:", error.message, error.status);
    // On ne révèle pas si c'est l'e-mail ou le mot de passe qui est faux,
    // mais on remonte les autres erreurs (réseau, config, etc.) pour aider au diagnostic.
    if (
      error.message?.toLowerCase().includes("invalid login credentials") ||
      error.message?.toLowerCase().includes("invalid credentials")
    ) {
      return { message: "Identifiants incorrects." };
    }
    return { message: "Connexion impossible. Réessayez dans un instant." };
  }
  await admin.from("login_attempts").delete().eq("email", email);
  const { data: profile } = await admin
    .from("profiles")
    .select("structure_id, role")
    .eq("id", data.user.id)
    .maybeSingle();
  await logAudit({
    structureId: profile?.structure_id ?? null,
    userId: data.user.id,
    action: "login",
    details: { email, role: profile?.role ?? null },
  });
  redirect("/tableau");
}

export async function logout() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const admin = createServiceClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("structure_id")
      .eq("id", data.user.id)
      .maybeSingle();
    await logAudit({
      structureId: profile?.structure_id ?? null,
      userId: data.user.id,
      action: "logout",
      details: { email: data.user.email ?? null },
    });
  }
  await supabase.auth.signOut();
  redirect("/connexion");
}