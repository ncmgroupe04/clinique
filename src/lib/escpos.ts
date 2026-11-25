/**
 * Minimal ESC/POS encoder: the receipt is rendered as a 1-bit image by the
 * browser, so no text, font or codepage command is ever sent to the printer.
 * A non-zero pixel means a printed (black) dot.
 */
export type ReceiptBitmap = {
  widthDots: number;
  heightDots: number;
  pixels: Uint8Array;
};

export type EscposOptions = {
  /** Lines to feed after the image so the receipt clears the tear bar. */
  feedLines?: number;
  /** Emit the partial-cut command (ignored by printers without a cutter). */
  cut?: boolean;
  /** Rows per GS v 0 command; small printer buffers need modest bands. */
  bandRows?: number;
};

/** Packs dot rows into bytes, MSB first, padding each row to whole bytes. */
export function packBitmap(bitmap: ReceiptBitmap): Uint8Array {
  const widthBytes = Math.ceil(bitmap.widthDots / 8);
  const packed = new Uint8Array(widthBytes * bitmap.heightDots);

  for (let y = 0; y < bitmap.heightDots; y += 1) {
    for (let x = 0; x < bitmap.widthDots; x += 1) {
      if (bitmap.pixels[y * bitmap.widthDots + x]) {
        packed[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  return packed;
}

/** Builds the byte stream, split into parts small enough for printer buffers. */
export function buildEscposParts(bitmap: ReceiptBitmap, options: EscposOptions = {}): Uint8Array[] {
  const bandRows = options.bandRows ?? 128;
  const widthBytes = Math.ceil(bitmap.widthDots / 8);
  const packed = packBitmap(bitmap);
  const parts: Uint8Array[] = [Uint8Array.of(0x1b, 0x40)]; // ESC @

  for (let start = 0; start < bitmap.heightDots; start += bandRows) {
    const rows = Math.min(bandRows, bitmap.heightDots - start);
    const header = Uint8Array.of(
      0x1d, 0x76, 0x30, 0x00, // GS v 0, mode 0
      widthBytes & 0xff, (widthBytes >> 8) & 0xff,
      rows & 0xff, (rows >> 8) & 0xff,
    );
    const data = packed.subarray(start * widthBytes, (start + rows) * widthBytes);
    const part = new Uint8Array(header.length + data.length);
    part.set(header, 0);
    part.set(data, header.length);
    parts.push(part);
  }

  const feed = Math.min(255, Math.max(0, options.feedLines ?? 4));
  parts.push(Uint8Array.of(0x1b, 0x64, feed)); // ESC d n
  if (options.cut !== false) parts.push(Uint8Array.of(0x1d, 0x56, 0x42, 0)); // GS V B n

  return parts;
}

/** Joins the parts into one buffer, ready to be POSTed to the local agent. */
export function concatParts(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) total += part.length;

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }

  return joined;
}
