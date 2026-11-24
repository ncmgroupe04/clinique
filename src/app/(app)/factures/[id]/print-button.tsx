"use client";

import { useTransition } from "react";
import { registerInvoicePrint } from "@/app/actions/invoices";

export default function PrintButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData();
          fd.set("id", invoiceId);
          await registerInvoicePrint(fd);
          window.print();
        });
      }}
      className="go"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" />
        <rect x="7" y="14" width="10" height="7" />
      </svg>
      {pending ? "Enregistrement…" : "Imprimer la facture"}
    </button>
  );
}
