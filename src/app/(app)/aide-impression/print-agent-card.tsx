"use client";

import { useEffect, useState } from "react";
import { buildEscposParts, concatParts } from "@/lib/escpos";
import { getPrintAgentInfo, pickDefaultPrinter, selectUsablePrinters, sendToPrintAgent, type PrintAgentInfo } from "@/lib/print-agent";
import { renderReceiptBitmap } from "@/lib/receipt-bitmap";
import type { ReceiptData } from "@/lib/receipt-layout";

const PRINTER_STORAGE_KEY = "print-agent-printer";

const SAMPLE_RECEIPT: ReceiptData = {
  structureName: "Clinique de démonstration",
  address: "12 rue des Fleurs, Abidjan",
  phone: "+225 01 02 03 04",
  headerText: null,
  receipt: "2026-0042",
  patientName: "Amara Koné",
  serviceName: "Cardiologie",
  quantity: 1,
  total: "5 000 F",
  advance: "2 000 F",
  remaining: "3 000 F",
  date: new Date().toLocaleString("fr-FR"),
  duplicate: false,
};

type Status = "checking" | "online" | "offline";

export default function PrintAgentCard() {
  const [status, setStatus] = useState<Status>("checking");
  const [info, setInfo] = useState<PrintAgentInfo | null>(null);
  const [printer, setPrinter] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const usablePrinters = info ? selectUsablePrinters(info.printers) : [];

  const refresh = async () => {
    setStatus("checking");
    const detected = await getPrintAgentInfo();
    if (!detected) {
      setInfo(null);
      setStatus("offline");
      return;
    }

    setInfo(detected);
    setStatus("online");
    const usable = selectUsablePrinters(detected.printers);
    const names = usable.map((item) => item.name);
    const stored = window.localStorage.getItem(PRINTER_STORAGE_KEY);
    const known = stored && names.includes(stored) ? stored : "";
    setPrinter(known || pickDefaultPrinter(usable, detected.defaultPrinter));
  };

  useEffect(() => {
    let alive = true;

    void getPrintAgentInfo().then((detected) => {
      if (!alive) return;
      if (!detected) {
        setInfo(null);
        setStatus("offline");
        return;
      }

      setInfo(detected);
      setStatus("online");
      const usable = selectUsablePrinters(detected.printers);
      const names = usable.map((item) => item.name);
      const stored = window.localStorage.getItem(PRINTER_STORAGE_KEY);
      const known = stored && names.includes(stored) ? stored : "";
      setPrinter(known || pickDefaultPrinter(usable, detected.defaultPrinter));
    });

    return () => {
      alive = false;
    };
  }, []);

  const testPrint = async () => {
    setMessage("");
    setBusy(true);
    try {
      const bitmap = renderReceiptBitmap(SAMPLE_RECEIPT, 80);
      const bytes = concatParts(buildEscposParts(bitmap));
      const sent = await sendToPrintAgent(bytes, { printerName: printer || undefined });
      setMessage(
        sent
          ? "Ticket de test envoyé à l'imprimante."
          : "Envoi impossible : vérifiez que l'agent est démarré et que l'imprimante est disponible.",
      );
    } catch {
      setMessage("Envoi impossible : vérifiez que l'agent est démarré.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-4 text-sm leading-relaxed">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Agent d&apos;impression local (recommandé)</h2>
          <p className="mt-1 text-muted">
            Il envoie le ticket directement à l&apos;imprimante en ESC/POS, sans passer par le
            pilote Windows. C&apos;est la solution fiable quel que soit le modèle d&apos;imprimante.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {status === "offline" && (
        <div className="space-y-3">
          <p>
            L&apos;agent n&apos;est pas démarré. Téléchargez-le, décompressez-le sur le PC où se
            trouve l&apos;imprimante, puis lancez{" "}
            <code className="font-semibold">start-print-agent.cmd</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/agent/start-print-agent.cmd" download className="btn-secondary">
              Télécharger le lanceur
            </a>
            <a href="/agent/print-agent.ps1" download className="btn-secondary">
              Télécharger l&apos;agent
            </a>
            <a href="/agent/LISEZ-MOI.txt" download className="btn-secondary">
              Lisez-moi
            </a>
            <button type="button" onClick={() => void refresh()} className="btn-secondary">
              Revérifier
            </button>
          </div>
          <p className="text-xs text-muted">
            Les deux fichiers doivent être dans le même dossier. Aucune installation ni droit
            administrateur n&apos;est nécessaire.
          </p>
        </div>
      )}

      {status === "online" && info && (
        <div className="space-y-3">
          <p>
            Agent détecté (version {info.version}). {usablePrinters.length} imprimante
            {usablePrinters.length > 1 ? "s" : ""} utilisable{usablePrinters.length > 1 ? "s" : ""}.
          </p>

          {usablePrinters.length > 0 && (
            <label className="block text-xs font-semibold text-muted">
              Imprimante utilisée
              <select
                value={printer}
                onChange={(event) => {
                  setPrinter(event.target.value);
                  window.localStorage.setItem(PRINTER_STORAGE_KEY, event.target.value);
                }}
                className="mt-1 w-full max-w-[360px] rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-ink"
              >
                {usablePrinters.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void testPrint()}
              disabled={busy || !printer}
              className="btn-primary disabled:opacity-60"
            >
              {busy ? "Envoi…" : "Imprimer un ticket de test (direct)"}
            </button>
            <button type="button" onClick={() => void refresh()} className="btn-secondary">
              Revérifier
            </button>
          </div>

          {message && <p className="text-xs font-semibold">{message}</p>}
        </div>
      )}

      {status === "checking" && <p className="text-muted">Recherche de l&apos;agent…</p>}
    </section>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "checking") {
    return (
      <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-bold text-muted">
        Vérification…
      </span>
    );
  }

  if (status === "online") {
    return (
      <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
        Agent détecté
      </span>
    );
  }

  return (
    <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-bold text-muted">
      Agent non détecté
    </span>
  );
}
