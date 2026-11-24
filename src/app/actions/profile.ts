"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export type ProfileState = { message?: string; success?: boolean } | undefined;

export async function updateProfileName(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length < 3) return { message: "Nom trop court (3 caractères minimum)." };

  const admin = createServiceClient();
  const { error } = await admin.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) return { message: "Mise à jour impossible." };

  revalidatePath("/profil");
  revalidatePath("/tableau");
  return { success: true, message: "Profil mis à jour." };
}

export async function changePassword(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const next = String(formData.get("password") ?? "");
  if (
    next.length < 8 ||
    !/[A-Z]/.test(next) ||
    !/[a-z]/.test(next) ||
    !/[0-9]/.test(next) ||
    !/[^A-Za-z0-9]/.test(next)
  ) {
    return { message: "8 caractères minimum, majuscule, minuscule, chiffre et caractère spécial." };
  }

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: next });
  if (error) return { message: "Changement impossible." };

  return { success: true, message: "Mot de passe modifié." };
}

