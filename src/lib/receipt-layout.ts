/**
 * Pure layout for the thermal receipt. It emits draw commands that the
 * browser renders onto a canvas; keeping this free of DOM APIs makes the
 * receipt content testable and guarantees no text is ever sent to the printer.
 */
export type ReceiptData = {
  structureName: string | null;
  address: string | null;
  phone: string | null;
  headerText: string | null;
  receipt: string;
  patientName: string;
  serviceName: string;
  quantity: number;
  total: string;
  advance: string;
  remaining: string;
  date: string;
  duplicate: boolean;
};

export type DrawOp =
  | {
    type: "text";
    text: string;
    y: number;
    size: number;
    bold: boolean;
    align: "left" | "center" | "right";
  }
  | { type: "rule"; y: number; dashed: boolean };

export type ReceiptLayout = {
  widthDots: number;
  heightDots: number;
  margin: number;
  ops: DrawOp[];
};

/** 203 dpi: 80 mm -> 576 dots, 58 mm -> 384 dots. */
export function buildReceiptLayout(data: ReceiptData, paperWidthMm: number): ReceiptLayout {
  const widthDots = paperWidthMm === 58 ? 384 : 576;
  const margin = 16;
  const ops: DrawOp[] = [];
  let y = 18;

  const text = (
    text: string,
    size = 16,
    bold = false,
    align: "left" | "center" | "right" = "left",
  ) => {
    ops.push({ type: "text", text, y, size, bold, align });
    y += size + 10;
  };

  const pair = (left: string, right: string, bold = false, size = 16) => {
    ops.push({ type: "text", text: left, y, size, bold, align: "left" });
    ops.push({ type: "text", text: right, y, size, bold, align: "right" });
    y += size + 10;
  };

  const rule = () => {
    ops.push({ type: "rule", y, dashed: true });
    y += 14;
  };

  if (data.structureName) text(data.structureName, 20, true, "center");
  if (data.address) text(data.address, 14, false, "center");
  if (data.phone) text(`Tél. ${data.phone}`, 14, false, "center");
  if (data.headerText) text(data.headerText, 14, false, "center");
  if (ops.length > 0) rule();

  text(data.receipt, 22, true, "center");
  if (data.duplicate) text("DUPLICATA", 16, true, "center");
  rule();

  text(`Patient : ${data.patientName}`);
  text(`Service : ${data.serviceName}`);
  text(`Quantité : ${data.quantity}`);
  rule();

  pair("Total", data.total);
  pair("Avance", data.advance);
  pair("Reste à payer", data.remaining, true);
  rule();

  text(data.date, 14, false, "center");
  text("Merci de votre visite.", 14, false, "center");

  return { widthDots, heightDots: y + 20, margin, ops };
}
