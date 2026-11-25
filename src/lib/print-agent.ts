/**
 * Client for the optional local print agent. The agent runs on the operator's
 * PC (127.0.0.1), receives raw ESC/POS bytes and hands them to the Windows
 * spooler in RAW mode — so the installed printer driver is never involved.
 * When the agent is absent, the app falls back to the browser print dialog.
 */
export const PRINT_AGENT_URL = (
  process.env.NEXT_PUBLIC_PRINT_AGENT_URL ?? "http://127.0.0.1:9100"
).replace(/\/+$/, "");

const HEALTH_TIMEOUT_MS = 1200;
const PRINT_TIMEOUT_MS = 20000;

export type PrintAgentOptions = {
  /** Injected in tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type PrintAgentPrinter = {
  name: string;
  /** Windows port of the queue (USB002, PORTPROMPT:, nul:, …). */
  port: string | null;
};

export type PrintAgentInfo = {
  version: string;
  printers: PrintAgentPrinter[];
  defaultPrinter: string | null;
};

/** "(copy of 1)" queues are Windows duplicates pointing at the same port. */
const COPY_SUFFIX = /\s*\(copy of \d+\)\s*$/i;
const VIRTUAL_PORT = /^(PORTPROMPT:|nul:|SHRFAX:|AD_Port)/i;
const VIRTUAL_NAME = /(OneNote|Print to PDF|AnyDesk|\bFax\b)/i;

function isVirtualPrinter(printer: PrintAgentPrinter): boolean {
  return VIRTUAL_PORT.test(printer.port ?? "") || VIRTUAL_NAME.test(printer.name);
}

/**
 * Keeps the queues that can actually receive raw ESC/POS bytes: virtual
 * printers are dropped and duplicated "(copy of N)" queues collapse onto the
 * original name. If nothing survives the filter, every queue is kept so the
 * operator can still print.
 */
export function selectUsablePrinters(printers: PrintAgentPrinter[]): PrintAgentPrinter[] {
  const real = printers.filter((printer) => !isVirtualPrinter(printer));
  const candidates = real.length > 0 ? real : printers;

  const byBaseName = new Map<string, PrintAgentPrinter>();
  for (const printer of candidates) {
    const base = printer.name.replace(COPY_SUFFIX, "");
    const existing = byBaseName.get(base);
    if (!existing || printer.name.length < existing.name.length) {
      byBaseName.set(base, printer);
    }
  }

  // Several queues can target the same physical port (Windows duplicates,
  // old drivers). Keep one entry per port so the operator sees one printer.
  const byPort = new Map<string, PrintAgentPrinter>();
  const selected: PrintAgentPrinter[] = [];

  for (const printer of byBaseName.values()) {
    const port = printer.port ?? "";
    const physical = /^(USB\d*|COM\d+|LPT\d+)$/i.test(port);
    if (!physical) {
      selected.push(printer);
      continue;
    }

    const key = port.toLowerCase();
    const existing = byPort.get(key);
    if (!existing) {
      byPort.set(key, printer);
      selected.push(printer);
      continue;
    }

    if (printer.name.length < existing.name.length) {
      selected[selected.indexOf(existing)] = printer;
      byPort.set(key, printer);
    }
  }

  return selected;
}

/** Resolves the printer to preselect, ignoring a duplicate default queue. */
export function pickDefaultPrinter(
  printers: PrintAgentPrinter[],
  defaultPrinter: string | null,
): string {
  if (printers.length === 0) return "";
  if (!defaultPrinter) return printers[0].name;

  const exact = printers.find((printer) => printer.name === defaultPrinter);
  if (exact) return exact.name;

  const base = defaultPrinter.replace(COPY_SUFFIX, "");
  const original = printers.find((printer) => printer.name === base);
  if (original) return original.name;

  const loose = printers.find((printer) => printer.name.replace(COPY_SUFFIX, "") === base);
  return loose ? loose.name : printers[0].name;
}

function normalizePrinter(value: unknown): PrintAgentPrinter | null {
  if (typeof value === "string") return { name: value, port: null };
  if (value && typeof value === "object") {
    const candidate = value as { name?: unknown; port?: unknown };
    if (typeof candidate.name === "string") {
      return {
        name: candidate.name,
        port: typeof candidate.port === "string" ? candidate.port : null,
      };
    }
  }
  return null;
}

/** AbortSignal.timeout is missing from older runtimes: build it defensively. */
function timeoutSignal(ms: number): AbortSignal | undefined {
  const factory = (AbortSignal as unknown as { timeout?: (value: number) => AbortSignal }).timeout;
  return typeof factory === "function" ? factory(ms) : undefined;
}

export async function getPrintAgentInfo(options: PrintAgentOptions = {}): Promise<PrintAgentInfo | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(`${PRINT_AGENT_URL}/health`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: timeoutSignal(options.timeoutMs ?? HEALTH_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      version?: unknown;
      printers?: unknown;
      defaultPrinter?: unknown;
    };

    const rawPrinters = Array.isArray(data.printers) ? data.printers : [];
    const printers = rawPrinters
      .map(normalizePrinter)
      .filter((printer): printer is PrintAgentPrinter => printer !== null);

    return {
      version: typeof data.version === "string" ? data.version : "?",
      printers,
      defaultPrinter: typeof data.defaultPrinter === "string" ? data.defaultPrinter : null,
    };
  } catch {
    return null;
  }
}

export async function isPrintAgentAvailable(options: PrintAgentOptions = {}): Promise<boolean> {
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(`${PRINT_AGENT_URL}/health`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: timeoutSignal(options.timeoutMs ?? HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function sendToPrintAgent(
  bytes: Uint8Array,
  options: PrintAgentOptions & { printerName?: string } = {},
): Promise<boolean> {
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(`${PRINT_AGENT_URL}/print`, {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      headers: {
        "Content-Type": "application/octet-stream",
        ...(options.printerName ? { "X-Printer-Name": options.printerName } : {}),
      },
      body: bytes as unknown as BodyInit,
      signal: timeoutSignal(options.timeoutMs ?? PRINT_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}
