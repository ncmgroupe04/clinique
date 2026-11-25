import { describe, expect, test } from "vitest";
import { buildReceiptLayout, type ReceiptData } from "../src/lib/receipt-layout";

const data: ReceiptData = {
  structureName: "Clinique Saint-Pierre",
  address: "12 rue des Fleurs, Abidjan",
  phone: "+225 01 02 03 04",
  headerText: "Marché en attente",
  receipt: "2026-0042",
  patientName: "Amara Koné",
  serviceName: "Cardiologie",
  quantity: 1,
  total: "5 000 F",
  advance: "2 000 F",
  remaining: "3 000 F",
  date: "25/11/2026 10:32",
  duplicate: false,
};

describe("buildReceiptLayout", () => {
  test("uses the exact print-head width in dots for 80 mm and 58 mm paper", () => {
    expect(buildReceiptLayout(data, 80).widthDots).toBe(576);
    expect(buildReceiptLayout(data, 58).widthDots).toBe(384);
  });

  test("renders every receipt field, in order, as draw commands", () => {
    const layout = buildReceiptLayout(data, 80);
    const texts = layout.ops.flatMap((op) => op.type === "text" ? [op.text] : []);

    expect(texts).toEqual([
      "Clinique Saint-Pierre",
      "12 rue des Fleurs, Abidjan",
      "Tél. +225 01 02 03 04",
      "Marché en attente",
      "2026-0042",
      "Patient : Amara Koné",
      "Service : Cardiologie",
      "Quantité : 1",
      "Total",
      "5 000 F",
      "Avance",
      "2 000 F",
      "Reste à payer",
      "3 000 F",
      "25/11/2026 10:32",
      "Merci de votre visite.",
    ]);
  });

  test("marks a reprint as DUPLICATA and keeps all commands inside the bitmap", () => {
    const layout = buildReceiptLayout({ ...data, duplicate: true }, 80);
    const texts = layout.ops.flatMap((op) => op.type === "text" ? [op.text] : []);

    expect(texts).toContain("DUPLICATA");
    expect(texts.indexOf("DUPLICATA")).toBeLessThan(texts.indexOf("Patient : Amara Koné"));
    for (const op of layout.ops) {
      expect(op.y).toBeLessThan(layout.heightDots);
    }
  });
});
