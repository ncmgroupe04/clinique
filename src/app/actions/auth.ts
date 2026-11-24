"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  signupSchema,
  loginSchema,
  type SignupState,
  type LoginState,
} from "@/lib/validations/auth";

export type { SignupState, LoginState };

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    return { message: error?.message ?? "Inscription impossible." };
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
        plan_id: planId || null,
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

    // Two example services (modifiable by the structure).
    await admin.from("services").insert([
      { structure_id: structure.id, name: "Consultation", price: 5000 },
      { structure_id: structure.id, name: "Visite prénatale", price: 3000 },
    ]);
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

  // Anti force brute : 5 tentatives maximum par minute et par e-mail.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data: recent } = await admin
    .from("login_attempts")
    .select("id")
    .eq("email", email)
    .gte("created_at", since);
  if ((recent?.length ?? 0) >= 5) {
    return { message: "Trop de tentatives de connexion. Réessayez dans une minute." };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    await admin.from("login_attempts").insert({ email });
    console.error("[login] Supabase error:", error.message, error.status);
    // On ne révèle pas si c'est l'e-mail ou le mot de passe qui est faux,
    // mais on remonte les autres erreurs (réseau, config, etc.) pour aider au diagnostic.
    if (
      error.message?.toLowerCase().includes("invalid login credentials") ||
      error.message?.toLowerCase().includes("invalid credentials")
    ) {
      return { message: "Identifiants incorrects." };
    }
    return { message: `Connexion impossible : ${error.message}` };
  }
  await admin.from("login_attempts").delete().eq("email", email);
  redirect("/tableau");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}