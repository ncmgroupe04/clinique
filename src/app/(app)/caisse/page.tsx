import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCaisseData } from "@/lib/caisse";
import ScreenHeader from "../screen-header";
import CaisseClient from "./caisse-client";

export default async function CaissePage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const initial = await getCaisseData(supabase, user.structureId, "today", null);

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Caisse"
        subtitle="Encaissements, dépenses et solde de la structure."
      />
      <CaisseClient initial={initial} />
    </div>
  );
}
