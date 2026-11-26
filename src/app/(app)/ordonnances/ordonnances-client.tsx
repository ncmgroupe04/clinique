"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type Med = { id: string; dci: string; brand: string | null; class: string; form: string; dosage: string | null };
type Line = { key: string; label: string; posology: string; duration: string };

const POSOLOGIES = ["1×3/jour", "2×2/jour", "1×2/jour", "1×1/jour", "Autre"];
const DURATIONS = ["3 jours", "5 jours", "7 jours", "10 jours", "15 jours", "30 jours", "1 mois", "2 mois"];

const durationToDays = (value: string): number | null => {
  const map: Record<string, number> = {
    "3 jours": 3, "5 jours": 5, "7 jours": 7, "10 jours": 10,
    "15 jours": 15, "30 jours": 30, "1 mois": 30, "2 mois": 60,
  };
  return map[value] ?? null;
};

type Structure = { name: string; address: string | null; phone: string | null; header_text: string | null };
export default function OrdonnancesClient({ medications, alternatives, structure, logoUrl }: { medications: Med[]; alternatives: Record<string, string[]>; structure: Structure | null; logoUrl: string | null }) {
  const [patient, setPatient] = useState("");
  const [age, setAge] = useState("");
  const [query, setQuery] = useState("");
  const [posology, setPosology] = useState("1×3/jour");
  const [duration, setDuration] = useState("5 jours");
  const [lines, setLines] = useState<Line[]>([]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return medications
      .filter((m) => (m.dci + " " + (m.brand ?? "") + " " + m.class).toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, medications]);

  function addLine(med: Med) {
    setLines((prev) => [...prev, { key: crypto.randomUUID(), label: `${med.dci}${med.dosage ? " " + med.dosage : ""} · ${med.form}`, posology, duration }]);
    setQuery("");
  }
  function addFree() {
    if (!query.trim()) return;
    setLines((prev) => [...prev, { key: crypto.randomUUID(), label: query.trim(), posology, duration }]);
    setQuery("");
  }
  function removeLine(key: string) { setLines((prev) => prev.filter((l) => l.key !== key)); }

  const today = new Date().toLocaleDateString("fr-FR");
  const formatAge = (v: string) => (/^\d+$/.test(v.trim()) ? `${v.trim()} ans` : v.trim());
  const clinicName = (structure?.name ?? "Clinique").replace(/\bGroupe\b/gi, "").replace(/\s+/g, " ").trim();

  async function handlePrint() {
    if (lines.length === 0) return;
    const supabase = createClient();
    const items = lines.map((l, i) => ({
      label: l.label,
      posology: l.posology,
      duration_days: durationToDays(l.duration),
      quantity: null,
      sort_order: i + 1,
    }));
    await supabase.rpc("create_prescription", { p_patient_name: patient || "Patient", p_patient_age: age || null, p_items: items });
    window.print();
  }

  return (
    <>
      <style>{`@media print {
        @page { size: A5; margin: 12mm; }
        body * { visibility: hidden !important; }
        .print-area, .print-area * { visibility: visible !important; }
        .print-area { position: absolute !important; left: 0; top: 0; width: 100% !important; box-shadow: none !important; }
        .no-print { display: none !important; }
      }`}</style>
      <div className="flex flex-1 flex-col gap-[26px]">
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          <section className="card flex min-w-0 flex-1 flex-col gap-4" style={{ padding: 24 }}>
            <div className="flex gap-3.5">
              <div className="min-w-0 flex-[3]">
                <label className="lbl">Nom et prénom</label>
                <input className="in" value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="Patient" />
              </div>
              <div className="min-w-0 flex-1">
                <label className="lbl">Âge</label>
                <input className="in" value={age} onChange={(e) => setAge(e.target.value)} placeholder="34 ans" />
              </div>
            </div>
            <div>
              <label className="lbl">Médicament</label>
              <input className="in" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="para" style={{ borderColor: "#0B7A6B" }} />
              {suggestions.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-[14px] border border-[#E2EAEF] text-[15px] font-semibold">
                  {suggestions.map((m, i) => (
                    <button key={m.id} type="button" onClick={() => addLine(m)} className="block w-full border-t border-[#E2EAEF] px-4 py-2.5 text-left first:border-t-0 hover:bg-[#DFF3EF]" style={{ background: i === 0 ? "#DFF3EF" : "#fff", color: i === 0 ? "#0B5F54" : "#0B1F2A" }}>
                      {m.dci}{m.dosage ? " " + m.dosage : ""} · {m.form}
                      {alternatives[m.id]?.length ? (
                        <span className="block text-[11px] font-normal text-[#4B5F6B]">Alt. : {alternatives[m.id].join(", ")}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
              {query && suggestions.length === 0 && (
                <button type="button" onClick={addFree} className="mt-2 text-sm font-semibold text-[#0B7A6B]">Pas dans la liste ? Ajouter « {query} » librement.</button>
              )}
            </div>
            <div>
              <span className="lbl">Posologie</span>
              <div className="flex flex-wrap gap-2">
                {POSOLOGIES.map((p) => (
                  <button key={p} type="button" onClick={() => setPosology(p)} className="chip shrink-0 whitespace-nowrap" style={{ flex: "none", flexDirection: "row", padding: "10px 16px", borderRadius: 999, borderColor: posology === p ? "#0B7A6B" : "#D5E0E6", background: posology === p ? "#DFF3EF" : "#fff", color: posology === p ? "#0B5F54" : "#0B1F2A" }}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="lbl">Durée</span>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button key={d} type="button" onClick={() => setDuration(d)} className="chip shrink-0 whitespace-nowrap" style={{ flex: "none", flexDirection: "row", padding: "10px 16px", borderRadius: 999, borderColor: duration === d ? "#0B7A6B" : "#D5E0E6", background: duration === d ? "#DFF3EF" : "#fff", color: duration === d ? "#0B5F54" : "#0B1F2A" }}>{d}</button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => { if (query.trim()) addFree(); }} className="go" style={{ height: 52, marginTop: "auto" }}>Ajouter la ligne</button>
          </section>
          <div className="flex w-full flex-col gap-4 lg:w-[480px] lg:shrink-0">
            <section className="card print-area" style={{ position: "relative", flex: 1, minHeight: "180mm", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 110 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ width: 280, maxWidth: 280, flexShrink: 1, overflowWrap: "anywhere" }}>
                  {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight: 44, maxWidth: 130, objectFit: "contain", marginBottom: 4 }} />}
                  <b style={{ fontSize: 14 }}>{clinicName}</b><br />
                  {structure?.address ?? "Adresse"}<br />
                  {structure?.phone ? "Tél. " + structure.phone : "Tél."}
                </div>
                <div style={{ width: 170, flexShrink: 0, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {today}<br />N° 001<br />{patient || "—"}{age ? `, ${formatAge(age)}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "center", fontSize: 17, fontWeight: 800, letterSpacing: 3 }}>ORDONNANCE</div>
              <div style={{ borderTop: "2px dashed #D5E0E6" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {lines.map((l, i) => (
                  <div key={l.key} className="ln" style={{ borderTop: "none", padding: "4px 0" }}>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                      <b>{i + 1}.</b> {l.label}<br />
                      <span style={{ color: "#4B5F6B" }}>{l.posology} · {l.duration}</span>
                    </div>
                    <button type="button" onClick={() => removeLine(l.key)} aria-label="Retirer" className="no-print" style={{ marginLeft: "auto", width: 36, height: 36, border: "none", borderRadius: 12, background: "#F2F5F7", color: "#4B5F6B", cursor: "pointer" }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ position: "absolute", right: 24, bottom: 58, fontSize: 13, color: "#4B5F6B", borderTop: "1px solid #E2EAEF", paddingTop: 10, paddingLeft: 12 }}>
                Signature et cachet
              </div>
              <div style={{ position: "absolute", left: 24, right: 24, bottom: 16, fontSize: 12, fontWeight: 700, color: "#1A4FA0", textAlign: "center" }}>
                Veuillez rapporter l’ordonnance au prochain rendez-vous !!!
              </div>
            </section>
            <button type="button" className="go" onClick={handlePrint}>Imprimer l’ordonnance</button>
          </div>
        </div>
      </div>
    </>
  );
}