import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ReglagesForm from "./reglages-form";

export default async function ReglagesPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "platform_admin") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const { data: structure } = await supabase
    .from("structures")
    .select("name, address, phone, header_text, paper_width_mm")
    .eq("id", user.structureId)
    .single();

  if (!structure) redirect("/tableau");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B1F2A]">Réglages</h1>
      <p className="text-sm text-[#4B5F6B]">
        En-tête de la structure et format du papier thermique.
      </p>
      <div className="card">
        <ReglagesForm
          defaults={{
            name: structure.name ?? "",
            address: structure.address ?? "",
            phone: structure.phone ?? "",
            header_text: structure.header_text ?? "",
            paper_width_mm: structure.paper_width_mm ?? 80,
          }}
        />
      </div>
    </div>
  );
}