import { redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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

  let categoryRows = categories ?? [];
  if (categoryRows.length === 0) {
    // Filet de sécurité : si la table existe mais est vide, on initialise les
    // catégories de base de la structure (le select des soins ne doit jamais
    // être vide).
    try {
      const admin = createServiceClient();
      const { error } = await admin.from("care_categories").upsert(
        [
          { structure_id: user.structureId, name: "Diagnostic", slug: "diagnostic" },
          { structure_id: user.structureId, name: "Intervention", slug: "intervention" },
          { structure_id: user.structureId, name: "Produit", slug: "produit" },
        ],
        { onConflict: "structure_id,slug", ignoreDuplicates: true },
      );
      if (!error) {
        const { data: seeded } = await supabase
          .from("care_categories")
          .select("id, name, slug, active")
          .eq("structure_id", user.structureId)
          .order("name", { ascending: true });
        categoryRows = seeded ?? [];
      }
    } catch {
      // Table pas encore créée (migration non appliquée) : on garde la liste vide
      // et l'interface utilise ses valeurs par défaut.
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Réglages · Soins et prix"
        subtitle="Catalogue des soins facturables (injections, pansements, perfusions, chambres…)."
      >
        <Link href="/factures/nouvelle" className="go" style={{ height: 44, width: "auto", padding: "0 20px", borderRadius: 12, fontSize: 14 }}>
          Facture
        </Link>
      </ScreenHeader>
      <SoinsClient cares={cares ?? []} categories={categoryRows} />
    </div>
  );
}
