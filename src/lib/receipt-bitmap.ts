import type { ReceiptBitmap } from "./escpos";
import { buildReceiptLayout, type ReceiptData } from "./receipt-layout";

/** Turns a canvas image into a 1-bit bitmap (1 = printed dot, 0 = blank). */
export function thresholdToBitmap(
  rgba: Uint8ClampedArray,
  widthDots: number,
  heightDots: number,
): ReceiptBitmap {
  const pixels = new Uint8Array(widthDots * heightDots);

  for (let i = 0; i < pixels.length; i += 1) {
    const offset = i * 4;
    const luminance = 0.299 * rgba[offset] + 0.587 * rgba[offset + 1] + 0.114 * rgba[offset + 2];
    pixels[i] = luminance < 128 ? 1 : 0;
  }

  return { widthDots, heightDots, pixels };
}

/** Draws the receipt at the printer's native resolution, then thresholds it. */
export function renderReceiptBitmap(data: ReceiptData, paperWidthMm: number): ReceiptBitmap {
  const layout = buildReceiptLayout(data, paperWidthMm);
  const canvas = document.createElement("canvas");
  canvas.width = layout.widthDots;
  canvas.height = layout.heightDots;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D indisponible");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.textBaseline = "alphabetic";

  for (const op of layout.ops) {
    if (op.type === "rule") {
      ctx.setLineDash(op.dashed ? [5, 4] : []);
      ctx.beginPath();
      ctx.moveTo(layout.margin, op.y);
      ctx.lineTo(layout.widthDots - layout.margin, op.y);
      ctx.stroke();
      continue;
    }

    ctx.setLineDash([]);
    ctx.font = `${op.bold ? "bold " : ""}${op.size}px Arial, Helvetica, sans-serif`;
    const textWidth = ctx.measureText(op.text).width;
    const x = op.align === "left"
      ? layout.margin
      : op.align === "right"
        ? layout.widthDots - layout.margin - textWidth
        : (layout.widthDots - textWidth) / 2;
    ctx.fillText(op.text, x, op.y);
  }

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return thresholdToBitmap(image.data, canvas.width, canvas.height);
}
