import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getNextReceipt } from "@/lib/receipts";
import ScreenHeader from "../screen-header";
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
    .select("*")
    .eq("id", user.structureId)
    .single();

  if (!structure) redirect("/tableau");

  const nextReceipt = await getNextReceipt(supabase, user.structureId);
  const dateLabel = new Date().toLocaleDateString("fr-FR");

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Réglages · En-tête"
        subtitle="À configurer en premier : l’en-tête s’imprime sur chaque ordonnance et chaque ticket."
      >
        <Link
          href="/aide-impression"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-accent"
        >
          Aide à l&apos;impression
        </Link>
      </ScreenHeader>
      <ReglagesForm
        defaults={{
          name: structure.name ?? "",
          address: structure.address ?? "",
          phone: structure.phone ?? "",
          header_text: structure.header_text ?? "",
          paper_width_mm: structure.paper_width_mm ?? 80,
          logo_path: structure.logo_path ?? "",
          structureId: user.structureId,
        }}
        nextReceipt={nextReceipt}
        dateLabel={dateLabel}
      />
    </div>
  );
}
