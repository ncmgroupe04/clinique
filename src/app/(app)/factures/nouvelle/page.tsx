import Link from "next/link";
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
    .select("id, name, price, active, unit, category")
    .eq("structure_id", user.structureId)
    .eq("active", true)
    .order("name", { ascending: true });

  const { data: categories } = await supabase
    .from("care_categories")
    .select("name, slug, active")
    .eq("structure_id", user.structureId)
    .order("name", { ascending: true });

  // Soins les plus utilisés : on les place devant dans la facture.
  const { data: usedItems } = await supabase
    .from("invoice_items")
    .select("care_name");
  const usage = new Map<string, number>();
  for (const item of usedItems ?? []) {
    usage.set(item.care_name, (usage.get(item.care_name) ?? 0) + 1);
  }
  const favorites = [...usage.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .map(([name]) => name);

  const [{ data: structure }, { data: template }, { data: invoiceTemplate }] = await Promise.all([
    supabase
      .from("structures")
      .select("name, address, phone, header_text")
      .eq("id", user.structureId)
      .maybeSingle(),
    supabase
      .from("print_templates")
      .select("header_text, footer_text, settings")
      .eq("structure_id", user.structureId)
      .eq("kind", "facture")
      .maybeSingle(),
    supabase
      .from("invoice_templates")
      .select("settings")
      .eq("structure_id", user.structureId)
      .eq("is_default", true)
      .maybeSingle(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Nouvelle facture" subtitle="Étape unique · Patient et soins">
        {user.role === "structure_admin" && (
          <Link
            href="/soins?ajouter=1"
            className="go"
            style={{
              height: 44,
              width: "auto",
              padding: "0 20px",
              borderRadius: 14,
              fontSize: 14,
              background: "#0b7a6b",
              color: "#fff",
            }}
          >
            + Nouveau tarif soin
          </Link>
        )}
      </ScreenHeader>
      <FactureForm
        cares={cares ?? []}
        categories={categories ?? []}
        structure={structure ?? null}
        template={template ?? null}
        invoiceTemplate={invoiceTemplate ?? null}
        favorites={favorites}
      />
    </div>
  );
}
