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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Logo illisible"));
    image.src = url;
  });
}

/** Draws the receipt at the printer's native resolution, then thresholds it. */
export async function renderReceiptBitmap(data: ReceiptData, paperWidthMm: number): Promise<ReceiptBitmap> {
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

  const imageOps = layout.ops.filter((op) => op.type === "image");
  const images = new Map<string, HTMLImageElement>();
  for (const op of imageOps) {
    if (op.type !== "image" || images.has(op.url)) continue;
    try {
      images.set(op.url, await loadImage(op.url));
    } catch {
      // Logo indisponible : on imprime le ticket sans lui.
    }
  }

  for (const op of layout.ops) {
    if (op.type === "rule") {
      ctx.setLineDash(op.dashed ? [5, 4] : []);
      ctx.beginPath();
      ctx.moveTo(layout.margin, op.y);
      ctx.lineTo(layout.widthDots - layout.margin, op.y);
      ctx.stroke();
      continue;
    }

    if (op.type === "image") {
      const image = images.get(op.url);
      if (image) {
        const ratio = image.width / image.height;
        const height = op.height;
        const width = Math.min(layout.widthDots - layout.margin * 2, height * ratio);
        ctx.drawImage(image, (layout.widthDots - width) / 2, op.y - height, width, height);
      }
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