import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ medications: [] });

  const supabase = await createClient();
  const escaped = q.replace(/[%,()]/g, " ");
  const { data } = await supabase
    .from("medications")
    .select("id, dci, brand, class, form, dosage")
    .eq("is_active", true)
    .or(`dci.ilike.%${escaped}%,brand.ilike.%${escaped}%,class.ilike.%${escaped}%`)
    .order("dci")
    .limit(20);

  return NextResponse.json({ medications: data ?? [] });
}