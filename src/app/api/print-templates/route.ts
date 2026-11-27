import { NextResponse } from "next/server";
import * as z from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const invoiceSettingsSchema = z.object({
  title: z.string().trim().max(80).default("Facture"),
  number_prefix: z.string().trim().max(20).default(""),
  show_date: z.boolean().default(true),
  show_indice: z.boolean().default(true),
  show_quantity: z.boolean().default(true),
  show_unit_price: z.boolean().default(true),
  show_discount: z.boolean().default(true),
  show_advance: z.boolean().default(true),
  show_stamp: z.boolean().default(true),
  show_logo: z.boolean().optional(),
  doctor_name: z.string().max(120).optional(),
  practice_line: z.string().max(120).optional(),
  intro_text: z.string().max(500).optional(),
  legal_footer: z.string().max(500).optional(),
  merge_rows: z.boolean().optional(),
  columns: z.array(z.object({
    key: z.string(),
    label: z.string(),
    source: z.string(),
    visible: z.boolean(),
    span: z.number().int(),
  })).optional(),
  extra_rows: z.array(z.string()).optional(),
});

const printTemplateSchema = z.object({
  kind: z.enum(["ticket", "facture", "ordonnance"]),
  header_text: z.string().max(500).nullish().transform((v) => v ?? null),
  footer_text: z.string().max(500).nullish().transform((v) => v ?? null),
  settings: invoiceSettingsSchema.optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (user.role !== "structure_admin") {
    return NextResponse.json(
      { error: "Accès réservé à l’administrateur de la structure." },
      { status: 403 },
    );
  }
  if (!user.structureId) {
    return NextResponse.json({ error: "Aucune structure associée." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = printTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const { kind, header_text, footer_text, settings } = parsed.data;
  const supabase = await createClient();
  const payload: Record<string, unknown> = {
    structure_id: user.structureId,
    kind,
    header_text,
    footer_text,
    updated_at: new Date().toISOString(),
  };
  // N'écrire `settings` que pour la facture et seulement si la colonne existe
  // (migration 0036). Sinon, l'upsert échouerait aussi pour Ticket et Ordonnance.
  if (kind === "facture" && settings) payload.settings = settings;
  const { error } = await supabase.from("print_templates").upsert(
    payload,
    { onConflict: "structure_id,kind" },
  );

  if (error) {
    console.error("print-templates upsert", error.message);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
