import { connection } from "next/server";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../../screen-header";
import SupportClient from "./support-client";

export type TicketRow = {
  id: string;
  structure_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  structure_name: string;
};

export default async function SupportPage() {
  await connection();
  await requireRole("platform_admin");
  const supabase = createServiceClient();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, structure_id, subject, message, status, priority, created_at")
    .order("created_at", { ascending: false });
  const { data: structures } = await supabase.from("structures").select("id, name");
  const { data: messages } = await supabase
    .from("support_messages")
    .select("id, ticket_id, body, created_at")
    .order("created_at", { ascending: true });
  const names = new Map((structures ?? []).map((s) => [s.id, s.name]));
  const rows: TicketRow[] = (tickets ?? []).map((t) => ({ ...t, structure_name: names.get(t.structure_id) ?? "—" }));

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Support" subtitle="Demandes d'assistance des structures et réponses." />
      <SupportClient tickets={rows} messages={(messages ?? []) as { id: string; ticket_id: string; body: string; created_at: string }[]} />
    </div>
  );
}
