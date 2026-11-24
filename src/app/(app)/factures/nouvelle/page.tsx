import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../../screen-header";
import FactureForm from "./facture-form";

export default async function NouvelleFacturePage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier" && user.role !== "platform_admin") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const { data: cares } = await supabase
    .from("cares")
    .select("id, name, price, active, unit")
    .eq("structure_id", user.structureId)
    .eq("active", true)
    .order("name", { ascending: true });

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Nouvelle facture" subtitle="Étape unique · Patient et soins" />
      <FactureForm cares={cares ?? []} />
    </div>
  );
}
