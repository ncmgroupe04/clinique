import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getNextReceipt } from "@/lib/receipts";
import { formatDateTime } from "@/lib/format";
import ScreenHeader from "../../screen-header";
import NouveauTicketForm from "./nouveau-ticket-form";

export default async function NouveauTicketPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, price")
    .eq("structure_id", user.structureId)
    .eq("active", true)
    .order("name", { ascending: true });

  const { data: structure } = await supabase
    .from("structures")
    .select("name, address, phone, header_text, paper_width_mm")
    .eq("id", user.structureId)
    .maybeSingle();

  const nextReceipt = await getNextReceipt(supabase, user.structureId);

  const today = new Date();
  const weekday = today.toLocaleDateString("fr-FR", { weekday: "long" });
  const dateLabel = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${today.toLocaleDateString(
    "fr-FR",
    { day: "numeric", month: "long", year: "numeric" },
  )}`;

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Nouveau ticket" subtitle={`Caisse · ${dateLabel}`}>
        <div className="rounded-full border border-border bg-white px-[18px] py-2.5 text-sm font-semibold">
          <span className="font-medium text-muted">Prochain reçu</span>{" "}
          {nextReceipt.year}-{String(nextReceipt.number).padStart(3, "0")}
        </div>
      </ScreenHeader>
      <NouveauTicketForm
        services={services ?? []}
        isAdmin={user.role === "structure_admin"}
        structure={structure}
        nextReceipt={nextReceipt}
        now={formatDateTime(new Date().toISOString())}
      />
    </div>
  );
}
