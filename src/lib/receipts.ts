import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Next receipt number for the current year (display only: the number is assigned server-side). */
export async function getNextReceipt(
  supabase: Client,
  structureId: string,
): Promise<{ year: number; number: number }> {
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from("tickets")
    .select("number")
    .eq("structure_id", structureId)
    .eq("year", year)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { year, number: (data?.number ?? 0) + 1 };
}
