import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import NouveauTicketForm from "./nouveau-ticket-form";

export default async function NouveauTicketPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, price")
    .eq("structure_id", user.structureId)
    .eq("active", true)
    .order("name", { ascending: true });

  const { data: structure } = await supabase
    .from("structures")
    .select("name, address, phone, header_text")
    .eq("id", user.structureId)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1F2A]">Nouveau ticket</h1>
        <p className="text-sm text-[#4B5F6B]">
          Caisse ·{" "}
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
      <NouveauTicketForm
        services={services ?? []}
        isAdmin={user.role === "structure_admin"}
        structure={structure}
      />
    </div>
  );
}