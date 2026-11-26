import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import ImpressionClient from "./impression-client";

export default async function ImpressionPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" || !user.structureId) {
    redirect("/tableau");
  }

  const supabase = await createClient();
  const [{ data: structure }, { data: templates }] = await Promise.all([
    supabase
      .from("structures")
      .select("name, paper_width_mm, print_format, address, phone, header_text, logo_path")
      .eq("id", user.structureId)
      .maybeSingle(),
    supabase
      .from("print_templates")
      .select("kind, header_text, footer_text, settings")
      .eq("structure_id", user.structureId),
  ]);

  if (!structure) redirect("/tableau");

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Configuration impression"
        subtitle="Personnalisez les textes imprimés en haut et en bas de chaque document."
      />
      <ImpressionClient
        structure={{
          name: structure.name ?? "",
          address: structure.address ?? "",
          phone: structure.phone ?? "",
          header_text: structure.header_text ?? "",
          paper_width_mm: structure.paper_width_mm ?? 80,
          print_format: structure.print_format ?? "80",
          logo_path: structure.logo_path ?? "",
        }}
        templates={templates ?? []}
      />
    </div>
  );
}
