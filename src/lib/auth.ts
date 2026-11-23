import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "platform_admin" | "structure_admin" | "cashier" | "docteur";

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  structureId: string | null;
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("structure_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    role: profile.role as Role,
    structureId: profile.structure_id,
  };
};

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/tableau");
  return user;
}