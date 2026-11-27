import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getNextReceipt } from "@/lib/receipts";
import { formatDateTime } from "@/lib/format";
import ScreenHeader from "../../screen-header";
import ServiceStep from "./service-step";
import TicketStep from "./ticket-step";

type SearchParams = {
  service?: string;
  autre?: string;
  nom?: string;
  prix?: string;
};

export default async function NouveauTicketPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier") {
    redirect("/tableau");
  }
  if (!user.structureId) redirect("/tableau");

  const sp = await searchParams;
  const supabase = await createClient();
  const step2Requested = Boolean(sp.service) || sp.autre === "1";

  if (!step2Requested) {
    const { data: services } = await supabase
      .from("services")
      .select("id, name, price")
      .eq("structure_id", user.structureId)
      .eq("active", true)
      .neq("name", "Visite prénatale")
      .order("name", { ascending: true });

    return (
      <div className="flex flex-1 flex-col gap-6">
        <ScreenHeader
          title="Nouveau ticket"
          subtitle="Étape 1 sur 2 · Choisissez le service pour continuer"
        >
          <div className="flex flex-wrap gap-2.5">
            <span className="rounded-full bg-accent px-[18px] py-2.5 text-sm font-bold text-white">
              1 · Service
            </span>
            <span className="rounded-full border border-border bg-white px-[18px] py-2.5 text-sm font-semibold text-muted">
              2 · Patient et paiement
            </span>
          </div>
        </ScreenHeader>
        <ServiceStep services={services ?? []} />
      </div>
    );
  }

  // Step 2: the chosen service is locked (validated server-side).
  let chosen: { id: string | null; label: string; price: number; other: boolean } | null = null;

  if (sp.service) {
    const { data } = await supabase
      .from("services")
      .select("id, name, price")
      .eq("structure_id", user.structureId)
      .eq("id", sp.service)
      .eq("active", true)
      .neq("name", "Visite prénatale")
      .maybeSingle();
    if (data) {
      chosen = { id: data.id, label: data.name, price: data.price, other: false };
    }
  } else if (sp.autre === "1") {
    const label = (sp.nom ?? "").trim();
    const price = Number(sp.prix);
    if (label && Number.isInteger(price) && price >= 0) {
      chosen = { id: null, label, price, other: true };
    }
  }

  if (!chosen) redirect("/tickets/nouveau");

  const { data: structure } = await supabase
    .from("structures")
    .select("name, address, phone, header_text, paper_width_mm")
    .eq("id", user.structureId)
    .maybeSingle();

  const nextReceipt = await getNextReceipt(supabase, user.structureId);

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Nouveau ticket" subtitle="Étape 2 sur 2 · Patient et paiement">
        <div className="rounded-full border border-border bg-white px-[18px] py-2.5 text-sm font-semibold">
          <span className="font-medium text-muted">Prochain reçu</span>{" "}
          {nextReceipt.year}-{String(nextReceipt.number).padStart(4, "0")}
        </div>
      </ScreenHeader>
      <TicketStep
        service={chosen}
        isAdmin={user.role === "structure_admin"}
        structure={structure}
        nextReceipt={nextReceipt}
        now={formatDateTime(new Date().toISOString())}
      />
    </div>
  );
}
