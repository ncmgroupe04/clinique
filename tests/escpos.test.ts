import { describe, expect, test } from "vitest";
import { buildEscposParts, concatParts, packBitmap, type ReceiptBitmap } from "../src/lib/escpos";

function bitmap(widthDots: number, rows: number[][]): ReceiptBitmap {
  const heightDots = rows.length;
  const pixels = new Uint8Array(widthDots * heightDots);
  rows.forEach((row, y) => row.forEach((value, x) => {
    pixels[y * widthDots + x] = value;
  }));
  return { widthDots, heightDots, pixels };
}

describe("packBitmap", () => {
  test("packs rows MSB-first, bit 1 meaning a printed dot, padding width to whole bytes", () => {
    const packed = packBitmap(bitmap(10, [
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    ]));

    expect(Array.from(packed)).toEqual([0b10101010, 0b11000000]);
  });

  test("keeps one byte per row for a width already aligned to 8 dots", () => {
    const packed = packBitmap(bitmap(8, [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ]));

    expect(Array.from(packed)).toEqual([0b11111111, 0b00000000]);
  });
});

describe("buildEscposParts", () => {
  test("starts with ESC @ and sends the raster with GS v 0 and little-endian dimensions", () => {
    const parts = buildEscposParts(bitmap(8, [[1, 1, 1, 1, 1, 1, 1, 1]]));

    expect(Array.from(parts[0])).toEqual([0x1b, 0x40]);

    const raster = parts[1];
    expect(Array.from(raster.slice(0, 8))).toEqual([0x1d, 0x76, 0x30, 0x00, 0x01, 0x00, 0x01, 0x00]);
    expect(Array.from(raster.slice(8))).toEqual([0b11111111]);
  });

  test("splits tall bitmaps into bands of 128 dot rows", () => {
    const rows = Array.from({ length: 300 }, () => Array(8).fill(0));
    const parts = buildEscposParts(bitmap(8, rows));

    const rasters = parts.filter((p) => p[0] === 0x1d && p[1] === 0x76 && p[2] === 0x30);
    expect(rasters).toHaveLength(3);
    expect(rasters.map((p) => p[6] + (p[7] << 8))).toEqual([128, 128, 44]);
  });

  test("appends feed and cut and never sends text or codepage commands", () => {
    const parts = buildEscposParts(bitmap(8, [[1, 1, 1, 1, 1, 1, 1, 1]]), { feedLines: 4, cut: true });

    const tail = parts.slice(-2);
    expect(Array.from(tail[0])).toEqual([0x1b, 0x64, 0x04]);
    expect(Array.from(tail[1])).toEqual([0x1d, 0x56, 0x42, 0x00]);

    const prefixes = parts.map((p) => [p[0], p[1]]);
    expect(prefixes.some(([a, b]) => a === 0x1b && b !== 0x40 && b !== 0x64)).toBe(false);
    expect(prefixes.some(([a, b]) => a === 0x1d && b !== 0x76 && b !== 0x56)).toBe(false);
  });
});

describe("concatParts", () => {
  test("joins every part into a single contiguous byte stream", () => {
    const joined = concatParts([
      Uint8Array.of(0x1b, 0x40),
      Uint8Array.of(0x1d, 0x76, 0x30),
      Uint8Array.of(0x1b, 0x64, 0x04),
    ]);

    expect(Array.from(joined)).toEqual([0x1b, 0x40, 0x1d, 0x76, 0x30, 0x1b, 0x64, 0x04]);
  });
});
