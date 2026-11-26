import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCaisseData } from "@/lib/caisse";
import { isCaissePeriod, type CaissePeriod } from "@/lib/depenses";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (user.role !== "structure_admin" && user.role !== "cashier") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (!user.structureId) {
    return NextResponse.json({ error: "Aucune structure associée." }, { status: 400 });
  }

  const url = new URL(request.url);
  const periodParam = url.searchParams.get("period");
  const period: CaissePeriod = isCaissePeriod(periodParam) ? periodParam : "today";
  const categorie = url.searchParams.get("categorie");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const from = fromParam && datePattern.test(fromParam) ? fromParam : null;
  const to = toParam && datePattern.test(toParam) ? toParam : null;

  const supabase = await createClient();
  const data = await getCaisseData(
    supabase,
    user.structureId,
    period,
    categorie,
    from && to ? { from, to } : null,
  );
  return NextResponse.json(data);
}
