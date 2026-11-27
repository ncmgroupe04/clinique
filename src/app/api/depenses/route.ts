import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createDepenseSchema, cancelDepenseSchema, restoreDepenseSchema } from "@/lib/validations/depenses";

function forbidden() {
  return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (user.role !== "structure_admin" && user.role !== "cashier") return forbidden();
  if (!user.structureId) {
    return NextResponse.json({ error: "Aucune structure associée." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createDepenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("depenses")
    .insert({
      structure_id: user.structureId,
      date: d.date,
      libelle: d.libelle,
      categorie: d.categorie,
      montant: d.montant,
      note: d.note ? d.note : null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Opération impossible." }, { status: 400 });
  }
  return NextResponse.json({ depense: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (user.role !== "structure_admin" && user.role !== "cashier") return forbidden();
  if (!user.structureId) {
    return NextResponse.json({ error: "Aucune structure associée." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (body && (body as { action?: string }).action === "restore") {
    const restored = restoreDepenseSchema.safeParse(body);
    if (!restored.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("depenses")
      .update({ status: "actif", cancel_reason: null })
      .eq("id", restored.data.id)
      .eq("structure_id", user.structureId)
      .eq("status", "annule")
      .select("*")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Dépense introuvable ou déjà active." }, { status: 404 });
    return NextResponse.json({ depense: data });
  }

  const parsed = cancelDepenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("depenses")
    .update({ status: "annule", cancel_reason: d.reason })
    .eq("id", d.id)
    .eq("structure_id", user.structureId)
    .eq("status", "actif")
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Opération impossible." }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "Dépense introuvable ou déjà annulée." }, { status: 404 });
  }
  return NextResponse.json({ depense: data });
}
