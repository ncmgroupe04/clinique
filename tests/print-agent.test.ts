import { describe, expect, test } from "vitest";
import {
  PRINT_AGENT_URL,
  isPrintAgentAvailable,
  pickDefaultPrinter,
  selectUsablePrinters,
  sendToPrintAgent,
  type PrintAgentPrinter,
} from "../src/lib/print-agent";

describe("isPrintAgentAvailable", () => {
  test("returns true when the agent health endpoint answers ok", async () => {
    const fetchImpl = (async (url: string) => {
      expect(url).toBe(`${PRINT_AGENT_URL}/health`);
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    await expect(isPrintAgentAvailable({ fetchImpl })).resolves.toBe(true);
  });

  test("returns false when the agent is not running", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    await expect(isPrintAgentAvailable({ fetchImpl })).resolves.toBe(false);
  });

  test("returns false when the agent refuses the request", async () => {
    const fetchImpl = (async () => new Response("forbidden", { status: 403 })) as unknown as typeof fetch;

    await expect(isPrintAgentAvailable({ fetchImpl })).resolves.toBe(false);
  });
});

describe("sendToPrintAgent", () => {
  test("posts the raw bytes to the print endpoint", async () => {
    let calledUrl = "";
    let calledInit: RequestInit | undefined;
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calledUrl = url;
      calledInit = init;
      return new Response('{"ok":true}', { status: 200 });
    }) as unknown as typeof fetch;

    const bytes = Uint8Array.of(0x1b, 0x40, 0x1b, 0x64, 0x04);
    await expect(sendToPrintAgent(bytes, { fetchImpl })).resolves.toBe(true);

    expect(calledUrl).toBe(`${PRINT_AGENT_URL}/print`);
    expect(calledInit?.method).toBe("POST");
    expect(Array.from(calledInit?.body as Uint8Array)).toEqual([0x1b, 0x40, 0x1b, 0x64, 0x04]);
  });

  test("returns false when the agent rejects or is unreachable", async () => {
    const failing = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    await expect(sendToPrintAgent(Uint8Array.of(0x1b), { fetchImpl: failing })).resolves.toBe(false);
  });
});

const printer = (name: string, port: string | null = "USB002"): PrintAgentPrinter => ({ name, port });

describe("selectUsablePrinters", () => {
  test("drops virtual printers that cannot receive raw ESC/POS", () => {
    const result = selectUsablePrinters([
      printer("POS-80", "USB002"),
      printer("Microsoft Print to PDF", "PORTPROMPT:"),
      printer("OneNote (Desktop)", "nul:"),
      printer("AnyDesk Printer", "AD_Port"),
    ]);

    expect(result.map((p) => p.name)).toEqual(["POS-80"]);
  });

  test("collapses a duplicated queue onto its original name", () => {
    const result = selectUsablePrinters([
      printer("POS-80"),
      printer("POS-80(copy of 1)"),
    ]);

    expect(result.map((p) => p.name)).toEqual(["POS-80"]);
  });

  test("keeps a single queue when several share one physical port", () => {
    const result = selectUsablePrinters([
      printer("POS-80(copy of 1)"),
      printer("POS-80"),
      printer("Xprinter XP-80"),
      printer("4BARCODE 4B-2054A"),
    ]);

    expect(result.map((p) => p.name)).toEqual(["POS-80"]);
  });

  test("keeps printers installed on different ports", () => {
    const result = selectUsablePrinters([
      printer("POS-80", "USB002"),
      printer("HP LaserJet", "USB001"),
    ]);

    expect(result.map((p) => p.name)).toEqual(["POS-80", "HP LaserJet"]);
  });

  test("keeps a copy when the original queue is absent", () => {
    const result = selectUsablePrinters([printer("POS-80(copy of 1)")]);

    expect(result.map((p) => p.name)).toEqual(["POS-80(copy of 1)"]);
  });

  test("falls back to every printer when only virtual ones are installed", () => {
    const result = selectUsablePrinters([
      printer("Microsoft Print to PDF", "PORTPROMPT:"),
      printer("OneNote (Desktop)", "nul:"),
    ]);

    expect(result).toHaveLength(2);
  });
});

describe("pickDefaultPrinter", () => {
  test("keeps the agent default when it is usable", () => {
    expect(pickDefaultPrinter([printer("POS-80"), printer("Xprinter XP-80")], "Xprinter XP-80")).toBe(
      "Xprinter XP-80",
    );
  });

  test("prefers the original queue over a duplicate marked as default", () => {
    expect(pickDefaultPrinter([printer("POS-80")], "POS-80(copy of 1)")).toBe("POS-80");
  });

  test("falls back to the first printer when the default is unknown", () => {
    expect(pickDefaultPrinter([printer("POS-80")], "Gone")).toBe("POS-80");
  });

  test("returns an empty string when no printer is available", () => {
    expect(pickDefaultPrinter([], null)).toBe("");
  });
});
