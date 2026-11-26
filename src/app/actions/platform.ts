"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

type State = { message?: string; success?: boolean; errors?: Record<string, string[]> } | undefined;

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function generatePlatformInvoices(formData: FormData): Promise<void> {
  await requireRole("platform_admin");
  const period = String(formData.get("period") || currentPeriod());
  const admin = createServiceClient();
  const [{ data: structures }, { data: plans }] = await Promise.all([
    admin.from("structures").select("id, plan_id, active, suspended").eq("active", true).eq("suspended", false),
    admin.from("subscription_plans").select("id, monthly_price"),
  ]);
  const prices = new Map((plans ?? []).map((p) => [p.id, p.monthly_price ?? 25000]));
  for (const s of structures ?? []) {
    const amount = s.plan_id ? prices.get(s.plan_id) ?? 25000 : 25000;
    await admin
      .from("platform_invoices")
      .upsert(
        { structure_id: s.id, period, amount, status: "en_attente" },
        { onConflict: "structure_id,period", ignoreDuplicates: true },
      );
  }
  revalidatePath("/admin/facturation");
}

export async function markInvoicePaid(formData: FormData): Promise<void> {
  await requireRole("platform_admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createServiceClient();
  await admin
    .from("platform_invoices")
    .update({ status: "payee", paid_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/facturation");
}

export async function createSupportTicket(_prev: State, formData: FormData): Promise<State> {
  const user = await requireRole("structure_admin", "cashier");
  if (!user.structureId) return { message: "Aucune structure associée." };
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  if (subject.length < 3 || message.length < 3) {
    return { errors: { subject: ["Sujet et message requis (3 caractères minimum)."] } };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("support_tickets").insert({
    structure_id: user.structureId,
    subject: subject.slice(0, 200),
    message: message.slice(0, 5000),
    priority: ["faible", "normal", "urgent"].includes(priority) ? priority : "normal",
  });
  if (error) return { message: error.message };
  revalidatePath("/admin/support");
  return { success: true, message: "Demande envoyée." };
}

export async function replySupportTicket(_prev: State, formData: FormData): Promise<State> {
  await requireRole("platform_admin", "structure_admin", "cashier");
  const ticketId = String(formData.get("ticket_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!ticketId || body.length < 2) return { message: "Réponse trop courte." };
  const supabase = await createClient();
  const { error } = await supabase.from("support_messages").insert({ ticket_id: ticketId, body: body.slice(0, 5000) });
  if (error) return { message: error.message };
  await supabase
    .from("support_tickets")
    .update({ status: "en_cours", updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  revalidatePath("/admin/support");
  return { success: true };
}

export async function updateSupportStatus(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin", "structure_admin");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["ouvert", "en_cours", "resolu", "ferme"].includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  await logAudit({ structureId: user.structureId, userId: user.id, action: "support_status_updated", details: { ticket_id: id, status } });
  revalidatePath("/admin/support");
}

export async function markNotificationRead(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin", "structure_admin", "cashier", "docteur");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/admin/notifications");
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireRole("platform_admin", "structure_admin", "cashier", "docteur");
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  revalidatePath("/admin/notifications");
}

export async function ensurePlatformNotifications(): Promise<void> {
  const admin = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: admins }, { data: structures }, { data: existing }] = await Promise.all([
    admin.from("profiles").select("id").eq("role", "platform_admin").eq("active", true),
    admin.from("structures").select("id, name, subscription_ends_at, active, suspended, registration_fee_paid"),
    admin.from("notifications").select("title, user_id").gte("created_at", `${today}T00:00:00`),
  ]);

  const adminIds = (admins ?? []).map((a) => a.id as string);
  if (!adminIds.length) return;

  const now = new Date();
  const alerts: { title: string; body: string; type: string }[] = [];

  for (const s of structures ?? []) {
    if (!s.subscription_ends_at) continue;
    const days = Math.ceil((new Date(s.subscription_ends_at).getTime() - now.getTime()) / 86_400_000);
    if (days <= 7) {
      alerts.push({
        title: `Abonnement · ${s.name}`,
        body: days < 0
          ? "L'abonnement est expiré. Prévenez la structure."
          : `L'abonnement expire dans ${days} jour(s).`,
        type: "warning",
      });
    }
  }

  const pending = (structures ?? []).filter((s) => !s.registration_fee_paid).length;
  if (pending > 0) {
    alerts.push({
      title: `${pending} inscription(s) à valider`,
      body: "Consultez la page Inscriptions.",
      type: "info",
    });
  }

  const seen = new Set((existing ?? []).map((n) => `${n.user_id}|${n.title}`));
  const toInsert: { user_id: string; title: string; body: string; type: string }[] = [];
  for (const userId of adminIds) {
    for (const alert of alerts) {
      const key = `${userId}|${alert.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      toInsert.push({ user_id: userId, ...alert });
    }
  }
  if (toInsert.length) {
    await admin.from("notifications").insert(toInsert);
  }
}

export async function updatePlatformSetting(formData: FormData): Promise<void> {
  const user = await requireRole("platform_admin");
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!key) return;
  const admin = createServiceClient();
  await admin.from("platform_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  await logAudit({ userId: user.id, action: "platform_setting_updated", details: { key } });
  revalidatePath("/admin/parametres");
}
