"use client";

import { useState } from "react";
import Link from "next/link";
import Pagination from "../pagination";

type Invoice = {
  id: string;
  year: number;
  number: number;
  patient_name: string;
  total: number;
  status: string;
  created_at: string;
};

function fcfa(v: number): string {
  return `${v.toLocaleString("fr-FR")} F`;
}

export default function FacturesClient({ invoices }: { invoices: Invoice[] }) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const start = (page - 1) * PAGE_SIZE;
  const visible = invoices.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-2">
      {invoices.length === 0 ? (
        <p className="text-sm text-muted">Aucune facture.</p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-bold text-ink">
                  Facture {inv.year}-{String(inv.number).padStart(3, "0")}
                  {inv.status === "annule" && <span className="ml-2 text-xs text-danger">(annulée)</span>}
                </p>
                <p className="text-xs text-muted">
                  {inv.patient_name} · {new Date(inv.created_at).toLocaleDateString("fr-FR")} · {fcfa(inv.total)}
                </p>
              </div>
              <Link href={`/factures/${inv.id}`} className="btn-secondary text-xs" style={{ height: 32, padding: "0 12px", borderRadius: 10 }}>
                Voir
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination total={invoices.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}
