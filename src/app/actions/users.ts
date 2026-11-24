"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createUserSchema, updateUserSchema, resetPasswordSchema, type UserState } from "@/lib/validations/users";

export type { UserState };

export async function createUser(
  _prev: UserState,
  formData: FormData,
): Promise<UserState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId && user.role !== "platform_admin") {
    return { message: "Aucune structure associée." };
  }
  const structureId = user.structureId;
  if (!structureId) return { message: "Aucune structure associée." };

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  const admin = createServiceClient();

  // Create auth user (auto-confirmed).
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    return { message: authError?.message ?? "Création du compte impossible." };
  }

  const newUserId = authData.user.id;

  // Create profile.
  const { error: profileError } = await admin.from("profiles").insert({
    id: newUserId,
    structure_id: structureId,
    role: d.role,
    full_name: d.full_name,
    active: true,
  });

  if (profileError) {
    // Best-effort cleanup.
    await admin.auth.admin.deleteUser(newUserId);
    return { message: "Création du profil impossible." };
  }

  revalidatePath("/utilisateurs");
  return { success: true, message: "Compte créé." };
}

export async function updateUser(
  _prev: UserState,
  formData: FormData,
): Promise<UserState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId && user.role !== "platform_admin") {
    return { message: "Aucune structure associée." };
  }

  const parsed = updateUserSchema.safeParse({
    user_id: formData.get("user_id"),
    full_name: formData.get("full_name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  // Ensure the target user belongs to the caller's structure (unless platform admin).
  const supabase = await createClient();
  if (user.role !== "platform_admin") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("structure_id")
      .eq("id", d.user_id)
      .maybeSingle();
    if (!profile || profile.structure_id !== user.structureId) {
      return { message: "Utilisateur introuvable." };
    }
  }

  const admin = createServiceClient();

  // Update email in auth.
  const { error: authError } = await admin.auth.admin.updateUserById(d.user_id, {
    email: d.email,
  });
  if (authError) {
    return { message: authError.message ?? "Mise à jour de l'e-mail impossible." };
  }

  // Update profile name.
  await admin.from("profiles").update({ full_name: d.full_name }).eq("id", d.user_id);

  revalidatePath("/utilisateurs");
  return { success: true, message: "Compte mis à jour." };
}

export async function resetUserPassword(
  _prev: UserState,
  formData: FormData,
): Promise<UserState> {
  const user = await requireRole("structure_admin", "platform_admin");
  if (!user.structureId && user.role !== "platform_admin") {
    return { message: "Aucune structure associée." };
  }

  const parsed = resetPasswordSchema.safeParse({
    user_id: formData.get("user_id"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  if (user.role !== "platform_admin") {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("structure_id")
      .eq("id", d.user_id)
      .maybeSingle();
    if (!profile || profile.structure_id !== user.structureId) {
      return { message: "Utilisateur introuvable." };
    }
  }

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(d.user_id, {
    password: d.password,
  });
  if (error) {
    return { message: error.message ?? "Réinitialisation impossible." };
  }

  revalidatePath("/utilisateurs");
  return { success: true, message: "Mot de passe réinitialisé." };
}

export async function toggleUserActive(formData: FormData): Promise<void> {
  await requireRole("structure_admin", "platform_admin");
  const userId = String(formData.get("user_id") ?? "");
  const active = formData.get("active") === "true";
  if (!userId) return;

  const admin = createServiceClient();
  await admin.from("profiles").update({ active }).eq("id", userId);
  revalidatePath("/utilisateurs");
}