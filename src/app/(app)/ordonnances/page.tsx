import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import OrdonnancesClient from "./ordonnances-client";

export default async function OrdonnancesPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "docteur") redirect("/tableau");
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const { data: medications } = await supabase
    .from("medications")
    .select("id, dci, brand, class, form, dosage")
    .eq("is_active", true)
    .order("dci")
    .limit(2000);

  const { data: structure } = await supabase
    .from("structures")
    .select("*")
    .eq("id", user.structureId)
    .single();

  const { data: altRows } = await supabase
    .from("medication_alternatives")
    .select("medication_id, alternative:medications!medication_alternatives_alternative_id_fkey(dci, dosage, form)");

  const alternatives: Record<string, string[]> = {};
  for (const r of altRows ?? []) {
    const med = r.alternative as unknown as { dci: string; dosage: string | null; form: string } | null;
    if (!med) continue;
    (alternatives[r.medication_id] ??= []).push(`${med.dci}${med.dosage ? " " + med.dosage : ""} · ${med.form}`);
  }

  const logoUrl = structure?.logo_path
    ? supabase.storage.from("structure-logos").getPublicUrl(structure.logo_path).data.publicUrl
    : null;

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Ordonnances" subtitle="Tapez les premières lettres, choisissez, imprimez." />
      <OrdonnancesClient medications={medications ?? []} alternatives={alternatives} structure={structure ?? null} logoUrl={logoUrl} />
    </div>
  );
}