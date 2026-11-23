"use client";

import { useTransition } from "react";
import { registerPrintAction } from "@/app/actions/tickets";

export default function PrintButton({ ticketId }: { ticketId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await registerPrintAction(ticketId);
          window.print();
        });
      }}
      className="btn-primary w-full disabled:opacity-60"
    >
      {pending ? "Préparation…" : "Imprimer le ticket"}
    </button>
  );
}