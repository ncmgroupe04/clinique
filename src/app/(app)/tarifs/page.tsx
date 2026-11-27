import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getNextReceipt } from "@/lib/receipts";
import ScreenHeader from "../screen-header";
import TarifsClient from "./tarifs-client";

export default async function TarifsPage({
  searchParams,
}: {
  searchParams: Promise<{ ajouter?: string }>;
}) {
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

  const { data: structure } = await supabase
    .from("structures")
    .select("paper_width_mm, print_format")
    .eq("id", user.structureId)
    .maybeSingle();

  const nextReceipt = await getNextReceipt(supabase, user.structureId);
  const params = await searchParams;

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Réglages · Tarifs"
        subtitle="Chaque structure saisit ses propres services et leurs prix."
      />
      <TarifsClient
        services={services ?? []}
        printFormat={structure?.print_format ?? "80"}
        nextReceipt={nextReceipt}
        autoFocus={params.ajouter === "1"}
      />
    </div>
  );
}
