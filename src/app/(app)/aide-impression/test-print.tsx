"use client";

export default function TestPrint() {
  return (
    <>
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .sample-print {
            width: 72mm;
            margin: 0 auto;
            padding: 2mm 3mm;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #fff;
          }
          .sample-print * { color: #000; }
        }
      `}</style>

      <div className="no-print">
        <button type="button" onClick={() => window.print()} className="btn-primary mx-auto w-full max-w-[280px]">
          Imprimer un ticket de test
        </button>
      </div>

      <div
        className="sample-print card mx-auto mt-4"
        style={{ maxWidth: "80mm", fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <div className="text-center mb-2">
          <p className="font-bold text-lg leading-tight">Clinique de démonstration</p>
          <p className="text-xs leading-tight">12 rue des Fleurs, Abidjan</p>
          <p className="text-xs leading-tight">Tél. +225 01 02 03 04</p>
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        <p className="text-center font-bold" style={{ fontSize: "18px" }}>
          2026-0042
        </p>

        <div className="border-t border-dashed border-gray-400 my-2" />

        <p className="text-sm"><span className="font-bold">Patient :</span> Amara Koné</p>
        <p className="text-sm"><span className="font-bold">Service :</span> Cardiologie</p>
        <p className="text-sm"><span className="font-bold">Quantité :</span> 1</p>

        <div className="border-t border-dashed border-gray-400 my-2" />

        <div className="text-sm space-y-1">
          <div className="flex justify-between"><span className="font-bold">Total</span><span>5 000 F</span></div>
          <div className="flex justify-between"><span className="font-bold">Avance</span><span>2 000 F</span></div>
          <div className="flex justify-between font-bold" style={{ fontSize: "16px" }}>
            <span>Reste à payer</span><span>3 000 F</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        <p className="text-xs text-center">25/11/2026 10:32</p>
        <p className="text-xs text-center mt-2">Merci de votre visite.</p>
      </div>
    </>
  );
}
