import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import * as z from "zod";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import AgendaClient, {
  type AgendaState,
  type Appointment,
  type Doctor,
} from "./agenda-client";

const allowedRoles = ["structure_admin", "cashier", "docteur"];

const createSchema = z.object({
  patient_name: z.string().trim().min(1, "Nom du patient requis.").max(200),
  patient_age: z.string().trim().max(40).optional().transform((v) => v || null),
  appointment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
    .refine((value) => {
      const [y, m, d] = value.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }, "Date invalide."),
  appointment_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide."),
  doctor_id: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((v) => v || null),
  motif: z.string().trim().max(500).optional().transform((v) => v || null),
});

export default async function AgendaPage() {
  await connection();
  const user = await requireUser();
  if (user.role === "platform_admin") redirect("/tableau");
  if (!user.structureId || !allowedRoles.includes(user.role)) redirect("/tableau");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("appointments")
    .select(
      "id, patient_name, patient_age, appointment_date, appointment_time, doctor_id, motif, status, cancel_reason, notes",
    )
    .eq("structure_id", user.structureId)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true })
    .limit(1000);

  const { data: doctorRows } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("structure_id", user.structureId)
    .eq("role", "docteur")
    .order("full_name", { ascending: true })
    .limit(500);

  const appointments: Appointment[] = (rows ?? []).map((row) => ({
    id: row.id,
    patient_name: row.patient_name,
    patient_age: row.patient_age,
    appointment_date: row.appointment_date,
    appointment_time: row.appointment_time,
    doctor_id: row.doctor_id,
    motif: row.motif,
    status: row.status as Appointment["status"],
    cancel_reason: row.cancel_reason,
    notes: row.notes,
  }));
  const doctors: Doctor[] = (doctorRows ?? []).map((d) => ({
    id: d.id,
    full_name: d.full_name,
  }));

  async function mutateAppointment(
    _prev: AgendaState,
    formData: FormData,
  ): Promise<AgendaState> {
    "use server";

    const current = await requireUser();
    if (
      current.role === "platform_admin" ||
      !current.structureId ||
      !allowedRoles.includes(current.role)
    ) {
      return { message: "Accès refusé." };
    }

    const op = formData.get("op");

    if (op === "create") {
      const parsed = createSchema.safeParse({
        patient_name: formData.get("patient_name"),
        patient_age: formData.get("patient_age") ?? "",
        appointment_date: formData.get("appointment_date"),
        appointment_time: formData.get("appointment_time"),
        doctor_id: formData.get("doctor_id") ?? "",
        motif: formData.get("motif") ?? "",
      });
      if (!parsed.success) {
        return {
          message: "Vérifiez les champs du formulaire.",
          errors: parsed.error.flatten().fieldErrors,
        };
      }

      const db = await createClient();
      const { error } = await db.from("appointments").insert({
        structure_id: current.structureId,
        patient_name: parsed.data.patient_name,
        patient_age: parsed.data.patient_age,
        appointment_date: parsed.data.appointment_date,
        appointment_time: parsed.data.appointment_time,
        doctor_id: parsed.data.doctor_id,
        motif: parsed.data.motif,
      });
      if (error) {
        console.error("appointment insert", error.message);
        return { message: "Ajout impossible." };
      }

      await logAudit({
        structureId: current.structureId,
        userId: current.id,
        action: "appointment_created",
        details: { appointment_date: parsed.data.appointment_date },
      });
      revalidatePath("/agenda");
      return { ok: true, message: "Rendez-vous ajouté." };
    }

    const idParsed = z.string().uuid().safeParse(formData.get("id"));
    if (!idParsed.success) return { message: "Rendez-vous introuvable." };

    let patch: { status: "termine" } | { status: "annule"; cancel_reason: string };
    let auditAction: string;
    let successMessage: string;

    if (op === "termine") {
      patch = { status: "termine" };
      auditAction = "appointment_completed";
      successMessage = "Rendez-vous terminé.";
    } else if (op === "annule") {
      const reason = String(formData.get("cancel_reason") ?? "").trim();
      if (reason.length < 3 || reason.length > 500) {
        return { message: "Motif d'annulation requis (3 à 500 caractères)." };
      }
      patch = { status: "annule", cancel_reason: reason };
      auditAction = "appointment_cancelled";
      successMessage = "Rendez-vous annulé.";
    } else {
      return { message: "Action inconnue." };
    }

    const db = await createClient();
    const { data, error } = await db
      .from("appointments")
      .update(patch)
      .eq("id", idParsed.data)
      .eq("structure_id", current.structureId)
      .eq("status", "planifie")
      .select("id");
    if (error || !data?.length) {
      return { message: "Rendez-vous introuvable ou déjà traité." };
    }

    await logAudit({
      structureId: current.structureId,
      userId: current.id,
      action: auditAction,
      details: { appointment_id: idParsed.data },
    });
    revalidatePath("/agenda");
    return { ok: true, message: successMessage };
  }

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Agenda"
        subtitle="Planifiez les rendez-vous et suivez leur statut par jour."
      />
      <AgendaClient appointments={appointments} doctors={doctors} mutate={mutateAppointment} />
    </div>
  );
}
