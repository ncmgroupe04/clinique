import { describe, expect, test } from "vitest";
import { thresholdToBitmap } from "../src/lib/receipt-bitmap";

describe("thresholdToBitmap", () => {
  test("turns dark pixels into printed dots and light pixels into blanks", () => {
    // 2x2 RGBA image: top-left black, top-right white, bottom-left mid-grey, bottom-right white.
    const rgba = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255,
      160, 160, 160, 255, 255, 255, 255, 255,
    ]);

    const bitmap = thresholdToBitmap(rgba, 2, 2);

    expect(bitmap.widthDots).toBe(2);
    expect(bitmap.heightDots).toBe(2);
    expect(Array.from(bitmap.pixels)).toEqual([1, 0, 0, 0]);
  });

  test("treats a fully black row as printed dots", () => {
    const rgba = new Uint8ClampedArray([
      0, 0, 0, 255, 0, 0, 0, 255,
      0, 0, 0, 255, 0, 0, 0, 255,
    ]);

    expect(Array.from(thresholdToBitmap(rgba, 2, 2).pixels)).toEqual([1, 1, 1, 1]);
  });
});
