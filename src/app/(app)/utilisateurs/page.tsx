import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import UtilisateursClient from "./utilisateurs-client";

export default async function UtilisateursPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "platform_admin") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const admin = createServiceClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role, active, created_at")
    .eq("structure_id", user.structureId)
    .order("created_at", { ascending: true });

  // Fetch emails from auth.users.
  const users = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      return { ...p, email: data?.user?.email ?? "" };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B1F2A]">Utilisateurs</h1>
      <p className="text-sm text-[#4B5F6B]">
        Gérez les comptes de votre structure (caissiers, administrateurs).
      </p>
      <UtilisateursClient users={users} />
    </div>
  );
}