import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import TarifsClient from "./tarifs-client";

export default async function TarifsPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "platform_admin") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, price, active")
    .eq("structure_id", user.structureId)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B1F2A]">Tarifs</h1>
      <p className="text-sm text-[#4B5F6B]">
        Services proposés par la structure. Un service désactivé n&apos;est plus
        proposé à la saisie mais reste sur les anciens tickets.
      </p>
      <TarifsClient services={services ?? []} />
    </div>
  );
}
