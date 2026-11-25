import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { restoreDepenseSchema } from "@/lib/validations/depenses";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (user.role !== "structure_admin" && user.role !== "cashier") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (!user.structureId) {
    return NextResponse.json({ error: "Aucune structure associée." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = restoreDepenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("depenses")
    .update({ status: "actif", cancel_reason: null })
    .eq("id", parsed.data.id)
    .eq("structure_id", user.structureId)
    .eq("status", "annule")
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Dépense introuvable ou déjà active." }, { status: 404 });
  return NextResponse.json({ depense: data });
}