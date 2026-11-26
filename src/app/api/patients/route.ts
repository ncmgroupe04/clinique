import { NextResponse } from "next/server";
import * as z from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  full_name: z.string().trim().min(1, "Nom requis.").max(200),
  phone: z.string().trim().max(40).nullish().transform((v) => v || null),
  patient_age: z.string().trim().max(40).nullish().transform((v) => v || null),
  notes: z.string().trim().max(1000).nullish().transform((v) => v || null),
});

const ALLOWED = ["structure_admin", "cashier", "docteur"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!user.structureId || !ALLOWED.includes(user.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .insert({
      structure_id: user.structureId,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      patient_age: parsed.data.patient_age,
      notes: parsed.data.notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("patients insert", error?.message ?? "no row");
    return NextResponse.json({ error: "Ajout impossible." }, { status: 400 });
  }

  await logAudit({
    structureId: user.structureId,
    userId: user.id,
    action: "patient_created",
    details: { patient_id: data.id },
  });

  return NextResponse.json({ ok: true, id: data.id });
}
