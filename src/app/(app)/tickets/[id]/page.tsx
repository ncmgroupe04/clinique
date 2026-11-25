import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCfa, formatReceipt, formatDateTime } from "@/lib/format";
import PrintButton from "./print-button";
import Link from "next/link";
import EncaisserButton from "@/app/(app)/encaisser-button";

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
    .select("name, address, phone, header_text, paper_width_mm, print_format")
    .eq("id", ticket.structure_id)
    .maybeSingle();

  const paperWidth = structure?.paper_width_mm === 58 ? 58 : 80;
  const printFormat = structure?.print_format ?? "80";
  const isA6 = printFormat === "a6";
  const zoneWidth = paperWidth === 58 ? 48 : 72;

  return (
    <>
      <style>{`
        @page { size: ${isA6 ? "105mm 148mm" : `${paperWidth}mm auto`}; margin: 0; }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .ticket-print {
            width: ${isA6 ? "105mm" : `${zoneWidth}mm`};
            margin: 0 auto;
            padding: ${isA6 ? "6mm 8mm" : "2mm 3mm"};
            font-family: ${isA6 ? "Arial, Helvetica, sans-serif" : "Arial, Helvetica, sans-serif"};
            color: #000;
            background: #fff;
          }
          .ticket-print * { color: #000; }
        }
      `}</style>
      <div className="space-y-4">
        <div className="no-print">
          <div className="flex items-center justify-between">
            <h1 className="scr-title">
              {formatReceipt(ticket.year, ticket.number)}
            </h1>
            <Link href="/tickets" className="btn-secondary">
              ← Retour
            </Link>
          </div>
        </div>

        {isA6 ? (
          <div
            className="ticket-print mx-auto"
            style={{ maxWidth: "105mm", fontFamily: "Arial, Helvetica, sans-serif", color: "#000", background: "#fff" }}
          >
            <div className="text-center">
              <p className="font-bold text-lg leading-tight">{structure?.name}</p>
              {(structure?.address || structure?.phone) && (
                <p className="text-xs leading-tight mt-1">
                  {[structure.address, structure.phone && `Tél. ${structure.phone}`].filter(Boolean).join(" · ")}
                </p>
              )}
              {structure?.header_text && <p className="text-xs leading-tight mt-1">{structure.header_text}</p>}
            </div>
            <div className="border-t border-black my-2" />
            <p className="text-center font-bold" style={{ fontSize: "23px", letterSpacing: "-0.5px" }}>
              {formatReceipt(ticket.year, ticket.number)}
            </p>
            <p className="text-center text-xs mt-1">{formatDateTime(ticket.created_at)}</p>
            <div className="border-t border-black my-2" />
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span>Nom et prénom</span><span className="font-medium">{ticket.patient_name}</span></div>
              <div className="flex justify-between"><span>Service</span><span className="font-medium">{ticket.service_name}</span></div>
              <div className="flex justify-between"><span>Montant total</span><span className="font-medium">{formatCfa(ticket.total)}</span></div>
              <div className="flex justify-between"><span>Avance</span><span className="font-medium">{formatCfa(ticket.advance)}</span></div>
            </div>
            <div className="border-2 border-black p-2.5 flex justify-between font-bold" style={{ fontSize: "18px" }}>
              <span>Reste à payer</span>
              <span>{formatCfa(ticket.remaining)}</span>
            </div>
            <div className="mt-auto flex justify-between items-end text-xs">
              <span>Merci de votre visite.</span>
              <span className="w-[110px] border-t border-black pt-1 text-center">Cachet</span>
            </div>
          </div>
        ) : (
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
              <span className="font-bold">Patient :</span> {ticket.patient_name}
            </p>
            <p className="text-sm">
              <span className="font-bold">Service :</span> {ticket.service_name}
            </p>
            <p className="text-sm">
              <span className="font-bold">Quantité :</span> {ticket.quantity}
            </p>

            <div className="border-t border-dashed border-gray-400 my-2" />

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="font-bold">Total</span>
                <span>{formatCfa(ticket.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Avance</span>
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
        )}

        <div className="no-print space-y-2">
          <PrintButton
            ticketId={ticket.id}
            thermal={!isA6}
            paperWidthMm={paperWidth}
            receipt={{
              structureName: structure?.name ?? null,
              address: structure?.address ?? null,
              phone: structure?.phone ?? null,
              headerText: structure?.header_text ?? null,
              receipt: formatReceipt(ticket.year, ticket.number),
              patientName: ticket.patient_name,
              serviceName: ticket.service_name,
              quantity: ticket.quantity,
              total: formatCfa(ticket.total),
              advance: formatCfa(ticket.advance),
              remaining: formatCfa(ticket.remaining),
              date: formatDateTime(ticket.created_at),
              duplicate: ticket.print_count > 0,
            }}
          />
          {isA6 && (
            <p className="text-xs text-[#4B5F6B] text-center">
              Papier normal A6 · 105 × 148 mm
            </p>
          )}
          {!isA6 && (
            <p className="text-xs text-[#4B5F6B] text-center">
              Papier : {paperWidth} mm (zone imprimable {zoneWidth} mm)
            </p>
          )}
          {ticket.status === "actif" && ticket.remaining > 0 && (
            <div className="flex justify-center pt-2">
              <EncaisserButton documentType="ticket" documentId={ticket.id} remaining={ticket.remaining} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
