import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addPaymentSchema } from "@/lib/validations/payments";

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null);
  const parsed = addPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_payment", {
    p_ticket_id: d.ticket_id ?? null,
    p_invoice_id: d.invoice_id ?? null,
    p_amount: d.amount,
    p_method: d.method,
    p_note: d.note ? d.note : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/caisse");
  if (d.ticket_id) {
    revalidatePath(`/tickets/${d.ticket_id}`);
    revalidatePath("/tickets");
    revalidatePath("/tickets/historique");
  }
  if (d.invoice_id) {
    revalidatePath(`/factures/${d.invoice_id}`);
    revalidatePath("/factures");
  }

  return NextResponse.json({ payment: data }, { status: 201 });
}
