import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCfa, formatReceipt, formatDateTime } from "@/lib/format";
import PrintButton from "./print-button";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier" && user.role !== "platform_admin") {
    redirect("/tableau");
  }
  const { id } = await params;

  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) notFound();

  const { data: structure } = await supabase
    .from("structures")
    .select("name, address, phone, header_text, paper_width_mm")
    .eq("id", ticket.structure_id)
    .maybeSingle();

  const paperWidth = structure?.paper_width_mm === 58 ? 58 : 80;
  const zoneWidth = paperWidth === 58 ? 48 : 72;

  return (
    <>
      <style>{`
        @page { size: ${paperWidth}mm auto; margin: 0; }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .ticket-print {
            width: ${zoneWidth}mm;
            margin: 0 auto;
            padding: 2mm 3mm;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #fff;
          }
          .ticket-print * { color: #000; }
        }
      `}</style>
      <div className="space-y-4">
        <div className="no-print">
          <h1 className="scr-title">
            {formatReceipt(ticket.year, ticket.number)}
          </h1>
        </div>

        <div
          className="ticket-print card mx-auto"
          style={{ maxWidth: `${zoneWidth}mm`, fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          <div className="text-center mb-2">
            <p className="font-bold text-lg leading-tight">{structure?.name}</p>
            {structure?.address && (
              <p className="text-xs leading-tight">{structure.address}</p>
            )}
            {structure?.phone && (
              <p className="text-xs leading-tight">Tél. {structure.phone}</p>
            )}
            {structure?.header_text && (
              <p className="text-xs leading-tight mt-1">{structure.header_text}</p>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          <p className="text-center font-bold" style={{ fontSize: "18px" }}>
            {formatReceipt(ticket.year, ticket.number)}
          </p>
          {ticket.print_count > 0 && (
            <p className="text-center font-bold text-red-600" style={{ fontSize: "14px" }}>
              DUPLICATA
            </p>
          )}

          <div className="border-t border-dashed border-gray-400 my-2" />

          <p className="text-sm">
            <span className="font-medium">Patient :</span> {ticket.patient_name}
          </p>
          <p className="text-sm">
            <span className="font-medium">Service :</span> {ticket.service_name}
          </p>
          <p className="text-sm">
            <span className="font-medium">Quantité :</span> {ticket.quantity}
          </p>

          <div className="border-t border-dashed border-gray-400 my-2" />

          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Total</span>
              <span>{formatCfa(ticket.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Avance</span>
              <span>{formatCfa(ticket.advance)}</span>
            </div>
            <div className="flex justify-between font-bold" style={{ fontSize: "16px" }}>
              <span>Reste à payer</span>
              <span>{formatCfa(ticket.remaining)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          <p className="text-xs text-center">
            {formatDateTime(ticket.created_at)}
          </p>
          <p className="text-xs text-center mt-2">Merci de votre visite.</p>
        </div>

        <div className="no-print space-y-2">
          <PrintButton ticketId={ticket.id} />
          <p className="text-xs text-[#4B5F6B] text-center">
            Papier : {paperWidth} mm (zone imprimable {zoneWidth} mm)
          </p>
        </div>
      </div>
    </>
  );
}
