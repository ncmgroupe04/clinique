import { connection } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import SupportStructureClient from "./support-structure-client";

export default async function SupportStructurePage() {
  await connection();
  const user = await requireRole("structure_admin", "cashier", "platform_admin");
  const supabase = await createClient();
  let query = supabase
    .from("support_tickets")
    .select("id, structure_id, subject, message, status, priority, created_at")
    .order("created_at", { ascending: false });
  if (user.role !== "platform_admin") {
    if (!user.structureId) return <p className="p-6">Aucune structure associée.</p>;
    query = query.eq("structure_id", user.structureId);
  }
  const { data: tickets } = await query;
  const ids = (tickets ?? []).map((t) => t.id as string);
  const { data: messages } = ids.length
    ? await supabase.from("support_messages").select("id, ticket_id, body, created_at").in("ticket_id", ids).order("created_at", { ascending: true })
    : { data: [] as { id: string; ticket_id: string; body: string; created_at: string }[] };

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Assistance" subtitle="Envoyez une demande à l'équipe de la plateforme et suivez les réponses." />
      <SupportStructureClient
        tickets={(tickets ?? []) as { id: string; structure_id: string; subject: string; message: string; status: string; priority: string; created_at: string }[]}
        messages={(messages ?? []) as { id: string; ticket_id: string; body: string; created_at: string }[]}
      />
    </div>
  );
}
