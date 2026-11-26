import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEPENSE_CATEGORIES, type DepenseRow } from "@/lib/depenses";
import ScreenHeader from "../screen-header";
import DepensesClient, {
  type DepensesData,
  type DepensesTotals,
} from "./depenses-client";

export default async function DepensesPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const { data } = await supabase
    .from("depenses")
    .select("*")
    .eq("structure_id", user.structureId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const depenses = (data ?? []) as DepenseRow[];

  let actif = 0;
  let annule = 0;
  let countActif = 0;
  let countAnnule = 0;
  const parCategorie = DEPENSE_CATEGORIES.map((categorie) => ({
    categorie,
    actif: 0,
    annule: 0,
    count: 0,
  }));

  for (const d of depenses) {
    const isAnnule = d.status === "annule";
    if (isAnnule) {
      annule += d.montant;
      countAnnule += 1;
    } else {
      actif += d.montant;
      countActif += 1;
    }
    const ligne = parCategorie.find((t) => t.categorie === d.categorie);
    if (ligne) {
      if (isAnnule) ligne.annule += d.montant;
      else ligne.actif += d.montant;
      ligne.count += 1;
    }
  }

  const totals: DepensesTotals = {
    actif,
    annule,
    countActif,
    countAnnule,
    parCategorie,
  };
  const initial: DepensesData = { depenses, totals };

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Dépenses / Sorties de caisse"
        subtitle="Suivi des sorties de caisse de la structure, par catégorie et par statut."
      />
      <DepensesClient initial={initial} />
    </div>
  );
}
