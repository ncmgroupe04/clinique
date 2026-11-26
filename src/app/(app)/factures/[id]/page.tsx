import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCfa, formatDateTime } from "@/lib/format";
import PrintButton from "./print-button";
import Link from "next/link";
import EncaisserButton from "@/app/(app)/encaisser-button";
import CancelInvoiceButton from "./cancel-button";

export default async function FactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "cashier" && user.role !== "platform_admin") {
    redirect("/tableau");
  }
  const { id } = await params;

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) notFound();

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id);

  const { data: structure } = await supabase
    .from("structures")
    .select("*")
    .eq("id", invoice.structure_id)
    .maybeSingle();

  const { data: template } = await supabase
    .from("print_templates")
    .select("header_text, footer_text, settings")
    .eq("structure_id", invoice.structure_id)
    .eq("kind", "facture")
    .maybeSingle();

  const tpl = {
    title: "Facture",
    number_prefix: "",
    show_quantity: true,
    show_unit_price: true,
    show_discount: true,
    show_advance: true,
    show_stamp: true,
    ...(template?.settings ?? {}),
  } as {
    title: string;
    number_prefix: string;
    show_quantity: boolean;
    show_unit_price: boolean;
    show_discount: boolean;
    show_advance: boolean;
    show_stamp: boolean;
  };
  const numberLabel = `${tpl.number_prefix}${invoice.year}-${String(invoice.number).padStart(4, "0")}`;

  const logoUrl = structure?.logo_path
    ? supabase.storage.from("structure-logos").getPublicUrl(structure.logo_path).data.publicUrl
    : null;

  return (
    <div className="space-y-4">
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .facture-print { color: #000; background: #fff; font-family: Arial, Helvetica, sans-serif; }
          .facture-print * { color: #000; }
        }
      `}</style>
      <div className="no-print flex items-center justify-between">
        <h1 className="scr-title">{`${tpl.title} ${numberLabel}`}</h1>
        <Link href="/factures" className="btn-secondary">← Retour</Link>
      </div>

      <div className="facture-print card mx-auto" style={{ maxWidth: "210mm", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div className="text-center mb-3">
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight: 70, maxWidth: 180, objectFit: "contain", margin: "0 auto 8px" }} />}
          <p className="font-bold text-lg leading-tight">{structure?.name}</p>
          {structure?.address && <p className="text-xs leading-tight">{structure.address}</p>}
          {structure?.phone && <p className="text-xs leading-tight">Tél. {structure.phone}</p>}
          {structure?.header_text && <p className="text-xs leading-tight mt-1">{structure.header_text}</p>}
          {template?.header_text?.trim() && <p className="text-xs leading-tight mt-1">{template.header_text}</p>}
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <p className="text-center font-bold" style={{ fontSize: "20px" }}>
          {`${tpl.title || "Facture"} ${numberLabel}`}
        </p>
        {invoice.print_count > 0 && (
          <p className="text-center font-bold text-red-600" style={{ fontSize: "14px" }}>DUPLICATA</p>
        )}
        <p className="text-xs text-center mt-1">{formatDateTime(invoice.created_at)}</p>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <p className="text-sm"><span className="font-bold">Patient :</span> {invoice.patient_name}</p>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-400">
              <th className="text-left py-1">Soin</th>
              {tpl.show_quantity && <th className="text-right py-1">Qté</th>}
              {tpl.show_unit_price && <th className="text-right py-1">Prix unit.</th>}
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it) => (
              <tr key={it.id} className="border-b border-gray-200">
                <td className="py-1">{it.care_name}</td>
                {tpl.show_quantity && <td className="text-right py-1">{it.quantity}</td>}
                {tpl.show_unit_price && <td className="text-right py-1">{formatCfa(it.unit_price)}</td>}
                <td className="text-right py-1">{formatCfa(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="text-sm space-y-1">
          <div className="flex justify-between"><span>Sous-total</span><span>{formatCfa(invoice.subtotal)}</span></div>
          {tpl.show_discount && <div className="flex justify-between"><span>Remise</span><span>−{formatCfa(invoice.discount)}</span></div>}
          <div className="flex justify-between font-bold" style={{ fontSize: "16px" }}><span>Total</span><span>{formatCfa(invoice.total)}</span></div>
          {tpl.show_advance && <div className="flex justify-between"><span>Avance</span><span>{formatCfa(invoice.advance)}</span></div>}
          <div className="flex justify-between font-bold" style={{ fontSize: "16px" }}><span>Reste à payer</span><span>{formatCfa(invoice.remaining)}</span></div>
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="flex justify-between items-end text-xs mt-4">
          <span>{template?.footer_text?.trim() || "Merci de votre visite."}</span>
          {tpl.show_stamp && (
            <span className="w-[120px] border-t border-black pt-1 text-center">Cachet / Signature</span>
          )}
        </div>
      </div>

      <div className="no-print space-y-2">
        <PrintButton invoiceId={invoice.id} />
        {invoice.status === "actif" && <CancelInvoiceButton invoiceId={invoice.id} />}
        {invoice.status === "actif" && invoice.remaining > 0 && (
          <div className="flex justify-start">
            <EncaisserButton documentType="facture" documentId={invoice.id} remaining={invoice.remaining} />
          </div>
        )}
        <p className="text-xs text-[#4B5F6B] text-center">
          {invoice.status === "annule" ? "Facture annulée" : "Papier : A4"}
        </p>
      </div>
    </div>
  );
}
