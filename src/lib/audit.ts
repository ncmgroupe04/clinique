import { createServiceClient } from "@/lib/supabase/server";

export type AuditEntry = {
  structureId?: string | null;
  userId?: string | null;
  action: string;
  details?: Record<string, unknown>;
  ticketId?: string | null;
};

const FORBIDDEN_KEY = /password|secret|token|authorization|cookie|api_key|email|full_name|patient_name|patient_age/i;

/**
 * Écrit une ligne dans le journal d'audit. Les champs sensibles sont retirés
 * avant insertion : aucun mot de passe, token ou secret ne doit être tracé.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  const details: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entry.details ?? {})) {
    if (FORBIDDEN_KEY.test(key)) continue;
    details[key] = value;
  }

  const supabase = createServiceClient();
  await supabase.from("audit_log").insert({
    structure_id: entry.structureId ?? null,
    user_id: entry.userId ?? null,
    action: entry.action,
    ticket_id: entry.ticketId ?? null,
    details,
  });
}
