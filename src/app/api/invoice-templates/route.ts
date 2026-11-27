import { NextResponse } from "next/server";
import * as z from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const columnSchema = z.object({
  key: z.string().max(40),
  label: z.string().max(60),
  source: z.string().max(40),
  visible: z.boolean(),
  span: z.number().int().min(1).max(2),
});

const settingsSchema = z.object({
  title: z.string().max(80).optional(),
  number_prefix: z.string().max(20).optional(),
  show_date: z.boolean().optional(),
  show_indice: z.boolean().optional(),
  show_quantity: z.boolean().optional(),
  show_unit_price: z.boolean().optional(),
  show_discount: z.boolean().optional(),
  show_advance: z.boolean().optional(),
  show_stamp: z.boolean().optional(),
  show_logo: z.boolean().optional(),
  doctor_name: z.string().max(120).optional(),
  practice_line: z.string().max(120).optional(),
  intro_text: z.string().max(500).optional(),
  legal_footer: z.string().max(500).optional(),
  merge_rows: z.boolean().optional(),
  columns: z.array(columnSchema).optional(),
  extra_rows: z.array(z.string().max(120)).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.structureId) return NextResponse.json({ templates: [] });
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoice_templates")
    .select("id, name, settings, is_default")
    .eq("structure_id", user.structureId)
    .order("created_at", { ascending: true });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.structureId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(80).optional(),
    settings: settingsSchema.optional(),
    is_default: z.boolean().optional(),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  const supabase = await createClient();
  const { id, name, settings, is_default } = parsed.data;

  if (is_default && id) {
    await supabase.from("invoice_templates").update({ is_default: false })
      .eq("structure_id", user.structureId);
    const { error } = await supabase.from("invoice_templates")
      .update({ is_default: true }).eq("id", id);
    if (error) return NextResponse.json({ error: "Mise à jour impossible." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (id) {
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (settings !== undefined) patch.settings = settings;
    const { error } = await supabase.from("invoice_templates").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: "Enregistrement impossible." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { data: created, error } = await supabase.from("invoice_templates").insert({
    structure_id: user.structureId,
    name: name ?? "Nouveau modèle",
    settings: settings ?? {},
    is_default: is_default ?? false,
  }).select("id").single();
  if (error) return NextResponse.json({ error: "Création impossible." }, { status: 400 });
  return NextResponse.json({ ok: true, id: created.id });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user?.structureId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("invoice_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Suppression impossible." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
