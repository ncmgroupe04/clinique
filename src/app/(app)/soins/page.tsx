import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import SoinsClient from "./soins-client";

export default async function SoinsPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "platform_admin") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const { data: cares } = await supabase
    .from("cares")
    .select("id, name, price, active, unit, category")
    .eq("structure_id", user.structureId)
    .order("created_at", { ascending: true });

  const { data: categories } = await supabase
    .from("care_categories")
    .select("id, name, slug, active")
    .eq("structure_id", user.structureId)
    .order("name", { ascending: true });

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Réglages · Soins et prix"
        subtitle="Catalogue des soins facturables (injections, pansements, perfusions, chambres…)."
      />
      <SoinsClient cares={cares ?? []} categories={categories ?? []} />
    </div>
  );
}
