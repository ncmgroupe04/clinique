"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { registerPrintAction } from "@/app/actions/tickets";
import { buildEscposParts, concatParts } from "@/lib/escpos";
import { getPrintAgentInfo, pickDefaultPrinter, selectUsablePrinters, sendToPrintAgent } from "@/lib/print-agent";
import { renderReceiptBitmap } from "@/lib/receipt-bitmap";
import type { ReceiptData } from "@/lib/receipt-layout";

const PRINTER_STORAGE_KEY = "print-agent-printer";

type AgentState = "checking" | "online" | "offline";

export default function PrintButton({
  ticketId,
  thermal,
  paperWidthMm,
  receipt,
}: {
  ticketId: string;
  thermal: boolean;
  paperWidthMm: number;
  receipt: ReceiptData;
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [agent, setAgent] = useState<AgentState>("checking");
  const [printers, setPrinters] = useState<string[]>([]);
  const [printer, setPrinter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!thermal) return;
    let alive = true;

    void getPrintAgentInfo().then((info) => {
      if (!alive) return;
      if (!info) {
        setAgent("offline");
        return;
      }

      setAgent("online");
      const usable = selectUsablePrinters(info.printers);
      const names = usable.map((item) => item.name);
      setPrinters(names);
      const stored = window.localStorage.getItem(PRINTER_STORAGE_KEY);
      const known = stored && names.includes(stored) ? stored : "";
      setPrinter(known || pickDefaultPrinter(usable, info.defaultPrinter));
    });

    return () => {
      alive = false;
    };
  }, [thermal]);

  const printViaBrowser = () => {
    setError("");
    startTransition(async () => {
      await registerPrintAction(ticketId);
      window.print();
    });
  };

  const printViaAgent = async () => {
    setError("");
    setBusy(true);

    let sent = false;
    try {
      const bitmap = renderReceiptBitmap(receipt, paperWidthMm);
      const bytes = concatParts(buildEscposParts(bitmap));
      sent = await sendToPrintAgent(bytes, { printerName: printer || undefined });
    } catch {
      sent = false;
    }

    if (!sent) {
      setBusy(false);
      setAgent("offline");
      setError("Impression directe impossible. Le ticket va s'ouvrir dans le dialogue d'impression.");
      printViaBrowser();
      return;
    }

    try {
      await registerPrintAction(ticketId);
    } catch {
      setError("Ticket imprimé, mais l'historique n'a pas pu être mis à jour.");
    } finally {
      setBusy(false);
    }
  };

  const disabled = pending || busy;

  return (
    <div className="space-y-2">
      <button
        disabled={disabled}
        onClick={() => {
          if (thermal && agent === "online") {
            void printViaAgent();
            return;
          }
          printViaBrowser();
        }}
        className="btn-primary mx-auto w-full max-w-[280px] disabled:opacity-60"
      >
        {busy || pending ? "Impression…" : "Imprimer le ticket"}
      </button>

      {thermal && agent === "online" && printers.length > 1 && (
        <label className="mx-auto block w-full max-w-[280px] text-xs font-semibold text-muted">
          Imprimante
          <select
            value={printer}
            onChange={(event) => {
              setPrinter(event.target.value);
              window.localStorage.setItem(PRINTER_STORAGE_KEY, event.target.value);
            }}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-ink"
          >
            {printers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}

      {thermal && agent === "offline" && (
        <p className="mx-auto max-w-[280px] text-center text-xs text-muted">
          Impression via le navigateur. Pour un rendu direct sans pilote, installez l&apos;agent
          d&apos;impression.
        </p>
      )}

      {error && (
        <p className="mx-auto max-w-[280px] text-center text-xs font-semibold text-red-600">{error}</p>
      )}

      <Link
        href="/aide-impression"
        className="mx-auto block text-center text-xs font-semibold text-muted underline underline-offset-2"
      >
        Problème d&apos;impression ?
      </Link>
    </div>
  );
}
