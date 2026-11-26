"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type Med = { id: string; dci: string; brand: string | null; class: string; form: string; dosage: string | null };
type Line = { key: string; label: string; dose: string; duration: string; quantity: string; cotation: string; medicationId: string | null };

const POSOLOGIES = ["1×3/jour", "2×3/jour", "1×2/jour", "2×2/jour", "1×1/jour"];
const MORE_POSOLOGIES = [
  "1×4/jour",
  "3×3/jour",
  "3×2/jour",
  "1 cp le matin",
  "1 cp le soir",
  "1 cp matin et soir",
  "1 sachet ×3/jour",
  "1 ampoule/jour",
  "1 injection/jour",
  "1 goutte ×3/jour",
  "1 cuillère ×3/jour",
  "1 suppositoire/jour",
  "Selon besoin",
];
const DOSE_OPTIONS = [...POSOLOGIES, ...MORE_POSOLOGIES];
const DURATION_SHORT = ["3", "5", "7"];
const DURATION_OPTIONS = ["3", "5", "7", "10", "15", "30", "60"];
const CATEGORIES = [
  { value: "", label: "Toutes" },
  { value: "douleur", label: "Douleur / Fièvre" },
  { value: "antibiotiques", label: "Antibiotiques" },
  { value: "paludisme", label: "Paludisme" },
  { value: "cardio", label: "Cœur / HTA" },
  { value: "digestif", label: "Digestif" },
  { value: "respiratoire", label: "Respiratoire" },
  { value: "enfant", label: "Enfant" },
  { value: "grossesse", label: "Grossesse" },
  { value: "dermato", label: "Dermatologie" },
  { value: "dentiste", label: "Dentiste" },
];
const MORE_CATEGORIES = [
  { value: "fievre", label: "Fièvre" },
  { value: "ophtalmo", label: "Ophtalmologie" },
  { value: "orl", label: "ORL" },
  { value: "vih", label: "VIH / IST" },
  { value: "tuberculose", label: "Tuberculose" },
  { value: "lepre", label: "Lèpre" },
  { value: "parasitoses", label: "Parasitoses" },
  { value: "vitamines", label: "Vitamines / Carences" },
  { value: "urologie", label: "Urologie" },
  { value: "rhumatologie", label: "Rhumatologie" },
  { value: "neurologie", label: "Neurologie" },
  { value: "psychiatric", label: "Psychiatrie" },
  { value: "oncologie", label: "Oncologie" },
  { value: "endocrino", label: "Endocrinologie" },
  { value: "hematologie", label: "Hématologie" },
  { value: "vaccins", label: "Vaccins" },
  { value: "urgences", label: "Urgences" },
  { value: "contraception", label: "Contraception" },
  { value: "homeopathie", label: "Homéopathie" },
];

type Structure = { name: string; address: string | null; phone: string | null; header_text: string | null };

const medLabel = (m: Med) =>
  `${m.dci}${m.dosage ? " " + m.dosage : ""}${m.form && m.form !== "—" ? " · " + m.form : ""}`;

export default function OrdonnancesClient({ alternatives, structure, logoUrl }: { alternatives: Record<string, string[]>; structure: Structure | null; logoUrl: string | null }) {
  const [patient, setPatient] = useState("");
  const [age, setAge] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [suggestions, setSuggestions] = useState<Med[]>([]);
  const [loading, setLoading] = useState(false);
  const [posology, setPosology] = useState("1×3/jour");
  const [duration, setDuration] = useState("5");
  const [quantity, setQuantity] = useState("");
  const [cotation, setCotation] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [number, setNumber] = useState("—");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q && !category) { setSuggestions([]); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (category) params.set("category", category);
        const res = await fetch(`/api/medicaments?${params.toString()}`, { cache: "no-store" });
        const json = await res.json();
        if (alive) setSuggestions(json.medications ?? []);
      } catch { if (alive) setSuggestions([]); }
      finally { if (alive) setLoading(false); }
    }, 150);
    return () => { alive = false; clearTimeout(t); };
  }, [query, category]);

  const clinicName = (structure?.name ?? "Clinique").replace(/\bGroupe\b/gi, "").replace(/\s+/g, " ").trim();
  const today = new Date().toLocaleDateString("fr-FR");
  const ageLabel = age.trim() ? (/^\d+$/.test(age.trim()) ? `${age.trim()} ans` : age.trim()) : "";
  const visibleCategories = showMore ? [...CATEGORIES, ...MORE_CATEGORIES] : CATEGORIES;
  const canAdd = Boolean(query.trim() || suggestions[0]);

  function addLine(label: string, medicationId: string | null = null) {
    if (!label) return;
    setLines((prev) => [...prev, { key: crypto.randomUUID(), label, dose: posology.trim() || "Posologie à préciser", duration: `${duration} jours`, quantity, cotation: cotation.trim(), medicationId }]);
    setQuery("");
    setSuggestions([]);
  }

  function addFirst() {
    if (suggestions[0]) addLine(medLabel(suggestions[0]), suggestions[0].id);
    else if (query.trim()) addLine(query.trim());
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function reset() {
    setPatient(""); setAge(""); setQuery(""); setCategory(""); setPosology("1×3/jour");
    setDuration("5"); setQuantity(""); setCotation(""); setLines([]); setNumber("—");
  }

  async function handlePrint() {
    if (lines.length === 0 || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("prescriptions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString());
      const seq = String((count ?? 0) + 1).padStart(3, "0");
      const ref = `${seq}/${new Date().getFullYear()}`;

      await supabase.rpc("create_prescription", {
        p_patient_name: patient.trim() || "Patient",
        p_patient_age: age.trim() || null,
        p_items: lines.map((l, i) => ({
          label: l.label,
          posology: l.dose,
          duration_days: parseInt(l.duration) || null,
          quantity: parseInt(l.quantity) || null,
          cotation: l.cotation,
          medication_id: l.medicationId,
          sort_order: i + 1,
        })),
      });

      flushSync(() => setNumber(ref));
      window.print();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`@media print {
        @page { size: A5; margin: 11mm; }
        body *:not(.paper):not(.paper *):not(:has(.paper)) { display: none !important; }
        .paper { position: absolute !important; left: 0; top: 0; width: 100% !important; min-height: 187mm !important; aspect-ratio: auto !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
        .no-print { display: none !important; }
      }`}</style>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* ---------------- Formulaire ---------------- */}
        <section className="card flex min-w-0 flex-1 flex-col gap-[18px]" style={{ padding: 22 }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="min-w-0 sm:flex-[3]">
              <label className="lbl" htmlFor="ordo-patient">Nom et prénom</label>
              <input id="ordo-patient" className="in" value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="Patient" autoComplete="off" />
            </div>
            <div className="w-full shrink-0 sm:w-[110px]">
              <label className="lbl" htmlFor="ordo-age">Âge</label>
              <input id="ordo-age" className="in" value={age} onChange={(e) => setAge(e.target.value)} placeholder="34 ans" inputMode="numeric" />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="lbl" style={{ marginBottom: 0 }}>Catégorie</span>
              <span className="text-[11px] font-semibold text-[#8CA1AC]">Filtre rapide du catalogue</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleCategories.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { setCategory(c.value); setQuery(""); }}
                  className="shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-[13px] py-[7px] text-[13px] font-bold transition-colors"
                  style={{
                    borderColor: category === c.value ? "#0B7A6B" : "#D5E0E6",
                    background: category === c.value ? "#DFF3EF" : "#fff",
                    color: category === c.value ? "#0B5F54" : "#0B1F2A",
                  }}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="shrink-0 whitespace-nowrap rounded-full bg-[#2F7FB5] px-[14px] py-[7px] text-[13px] font-bold text-white transition-colors hover:bg-[#26699a]"
                aria-expanded={showMore}
              >
                {showMore ? "Moins de spécialités" : "+ Autres spécialités"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_auto_96px_110px_auto]">
            <div className="min-w-0">
              <label className="lbl" htmlFor="ordo-med">Médicament</label>
              <input
                id="ordo-med"
                className="in"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFirst(); } }}
                placeholder="Tapez 3 lettres…"
                style={{ borderColor: "#0B7A6B" }}
                autoComplete="off"
              />
            </div>

            <div>
              <span className="lbl">Durée (jours)</span>
              <div className="flex h-[52px] overflow-hidden rounded-[14px] border-[1.5px] border-[#D5E0E6] bg-white">
                {DURATION_SHORT.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    aria-pressed={duration === d}
                    className="w-9 border-r border-[#E2EAEF] text-[14px] font-bold transition-colors last:border-r-0"
                    style={{ background: duration === d ? "#DFF3EF" : "#fff", color: duration === d ? "#0B5F54" : "#4B5F6B" }}
                  >
                    {d}
                  </button>
                ))}
                <select
                  value={DURATION_SHORT.includes(duration) ? "" : duration}
                  onChange={(e) => { if (e.target.value) setDuration(e.target.value); }}
                  className="h-full w-[46px] cursor-pointer bg-white px-1 text-[14px] font-bold text-[#0B1F2A] outline-none"
                  aria-label="Autre durée"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230b1f2a' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center", appearance: "none" }}
                >
                  <option value="">…</option>
                  {DURATION_OPTIONS.filter((d) => !DURATION_SHORT.includes(d)).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="lbl" htmlFor="ordo-qty">Quantité</label>
              <input id="ordo-qty" className="in" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="—" inputMode="numeric" />
            </div>

            <div>
              <label className="lbl" htmlFor="ordo-cotation">Cotation</label>
              <input
                id="ordo-cotation"
                className="in"
                value={cotation}
                onChange={(e) => setCotation(e.target.value)}
                placeholder="HBJD001"
                maxLength={50}
                title="Facultatif — lettres et chiffres (ex. HBJD001)"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={addFirst}
                disabled={!canAdd}
                className="go whitespace-nowrap disabled:cursor-not-allowed"
                style={{ height: 52, width: "100%", padding: "0 20px", fontSize: 14, opacity: canAdd ? 1 : 0.55 }}
              >
                Ajouter à l&apos;ordonnance
              </button>
            </div>
          </div>

          {(suggestions.length > 0 || loading || (query.trim() && !loading)) && (
            <div className="overflow-hidden rounded-[14px] border border-[#E2EAEF] bg-white text-[14px]">
              {loading && suggestions.length === 0 ? (
                <p className="px-4 py-3 text-sm font-semibold text-[#8CA1AC]">Recherche…</p>
              ) : null}

              {suggestions.length > 0 ? (
                <div className="max-h-[236px] overflow-y-auto">
                  {suggestions.slice(0, 12).map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => addLine(medLabel(m), m.id)}
                      className="flex w-full items-center gap-3 border-t border-[#EEF3F6] px-4 py-2.5 text-left first:border-t-0 hover:bg-[#F2FAF8]"
                      style={{ background: i === 0 ? "#DFF3EF" : "#fff" }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-[#0B1F2A]" style={{ color: i === 0 ? "#0B5F54" : "#0B1F2A" }}>
                          {m.dci}{m.dosage ? <span className="font-semibold text-[#0B7A6B]"> {m.dosage}</span> : null}
                        </span>
                        <span className="block truncate text-[11.5px] font-medium text-[#7A909C]">
                          {m.form && m.form !== "—" ? m.form : m.class && m.class !== "AMM" ? m.class : "Médicament"}
                          {alternatives[m.id]?.length ? ` · Alt. : ${alternatives[m.id].join(", ")}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-bold text-[#8CA1AC]">{i === 0 ? "Entrée ↵" : ""}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {!loading && query.trim() && suggestions.length === 0 ? (
                <button
                  type="button"
                  onClick={() => addLine(query.trim())}
                  className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#0B7A6B] hover:bg-[#F2FAF8]"
                >
                  Pas dans la liste ? Ajouter «&nbsp;{query.trim()}&nbsp;» librement.
                </button>
              ) : null}
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="lbl" style={{ marginBottom: 0 }}>Liste de prescription</span>
              <span className="rounded-full bg-[#F2F5F7] px-2.5 py-1 text-[11px] font-bold text-[#4B5F6B]">
                {lines.length} {lines.length > 1 ? "lignes" : "ligne"}
              </span>
            </div>
            <div className="overflow-hidden rounded-[14px] border border-[#E2EAEF]">
              {lines.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-[#8CA1AC]">Aucune ligne ajoutée.</p>
                  <p className="mt-1 text-[12px] text-[#A9BAC3]">Choisissez une catégorie ou tapez le nom d&apos;un médicament.</p>
                </div>
              ) : (
                <div>
                  {lines.map((l, i) => (
                    <div key={l.key} className="flex items-center gap-3 border-b border-[#EEF3F6] px-4 py-2.5 last:border-b-0">
                      <span className="w-4 shrink-0 text-[13px] font-bold text-[#A0B2BC]">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-[#0B1F2A]">{l.label}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {l.dose === "" ? (
                            <input
                              autoFocus
                              value={l.dose}
                              onChange={(e) => updateLine(l.key, { dose: e.target.value })}
                              onBlur={() => { if (!l.dose.trim()) updateLine(l.key, { dose: POSOLOGIES[0] }); }}
                              placeholder="Posologie"
                              className="w-[150px] rounded-md border border-[#0B7A6B] bg-white px-1.5 py-0.5 text-[11.5px] font-semibold text-[#0B1F2A] outline-none"
                              aria-label={`Posologie libre ligne ${i + 1}`}
                            />
                          ) : (
                            <select
                              value={l.dose}
                              onChange={(e) => updateLine(l.key, { dose: e.target.value === "__custom__" ? "" : e.target.value })}
                              className="max-w-[210px] cursor-pointer rounded-md border border-transparent bg-[#F2F5F7] px-1.5 py-0.5 text-[11.5px] font-semibold text-[#4B5F6B] outline-none focus:border-[#0B7A6B] focus:bg-white"
                              aria-label={`Posologie ligne ${i + 1}`}
                            >
                              {!DOSE_OPTIONS.includes(l.dose) ? <option value={l.dose}>{l.dose}</option> : null}
                              {DOSE_OPTIONS.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                              <option value="__custom__">Autre…</option>
                            </select>
                          )}
                          <select
                            value={l.duration}
                            onChange={(e) => updateLine(l.key, { duration: e.target.value })}
                            className="cursor-pointer rounded-md border border-transparent bg-[#F2F5F7] px-1.5 py-0.5 text-[11.5px] font-semibold text-[#4B5F6B] outline-none focus:border-[#0B7A6B] focus:bg-white"
                            aria-label={`Durée ligne ${i + 1}`}
                          >
                            {DURATION_OPTIONS.map((d) => (
                              <option key={d} value={`${d} jours`}>{d} jours</option>
                            ))}
                            {!DURATION_OPTIONS.includes(l.duration.replace(" jours", "")) ? (
                              <option value={l.duration}>{l.duration}</option>
                            ) : null}
                          </select>
                          {l.quantity ? (
                            <span className="rounded-md bg-[#DFF3EF] px-1.5 py-0.5 text-[11.5px] font-bold text-[#0B5F54]">Qté {l.quantity}</span>
                          ) : null}
                          <input
                            value={l.cotation}
                            onChange={(e) => updateLine(l.key, { cotation: e.target.value })}
                            maxLength={50}
                            placeholder="Cotation"
                            className="w-[100px] rounded-md border border-[#D5E0E6] bg-white px-1.5 py-0.5 text-[11.5px] font-bold text-[#0B1F2A] outline-none focus:border-[#0B7A6B]"
                            aria-label={`Cotation ligne ${i + 1}`}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                        aria-label={`Retirer la ligne ${i + 1}`}
                        className="no-print flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2F5F7] text-[#7A909C] transition-colors hover:bg-[#FDE8E8] hover:text-[#B42318]"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v5M14 11v5" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="lbl" style={{ marginBottom: 0 }}>Posologie</span>
              <span className="text-[11px] font-semibold text-[#8CA1AC]">Appliquée aux prochaines lignes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POSOLOGIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPosology(p)}
                  aria-pressed={posology === p}
                  className="shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-[14px] py-[7px] text-[13px] font-bold transition-colors"
                  style={{
                    borderColor: posology === p ? "#0B7A6B" : "#D5E0E6",
                    background: posology === p ? "#DFF3EF" : "#fff",
                    color: posology === p ? "#0B5F54" : "#0B1F2A",
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPosology("")}
                aria-pressed={!POSOLOGIES.includes(posology)}
                className="shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-[14px] py-[7px] text-[13px] font-bold transition-colors"
                style={{
                  borderColor: !POSOLOGIES.includes(posology) ? "#0B7A6B" : "#D5E0E6",
                  background: !POSOLOGIES.includes(posology) ? "#DFF3EF" : "#fff",
                  color: !POSOLOGIES.includes(posology) ? "#0B5F54" : "#0B1F2A",
                }}
              >
                Autre
              </button>
            </div>
            {!POSOLOGIES.includes(posology) ? (
              <input
                autoFocus
                value={posology}
                onChange={(e) => setPosology(e.target.value)}
                placeholder="Saisir la posologie (ex. 1 cp le soir)"
                className="in mt-2"
                style={{ height: 44 }}
                aria-label="Posologie personnalisée"
              />
            ) : null}
          </div>
        </section>

        {/* ---------------- Aperçu A5 ---------------- */}
        <div className="mx-auto flex w-full max-w-[440px] flex-col gap-3 lg:mx-0 lg:w-[440px] lg:shrink-0 lg:max-w-none">
          <div className="no-print flex items-center justify-between px-1 lg:hidden">
            <span className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#8CA1AC]">Aperçu avant impression</span>
            <span className="rounded-full bg-[#DFF3EF] px-2.5 py-1 text-[10px] font-extrabold tracking-[1px] text-[#0B5F54]">A5</span>
          </div>

          <section
            className="paper relative mx-auto flex w-full max-w-[440px] flex-col overflow-hidden rounded-[16px] bg-white lg:max-w-none"
            style={{
              boxShadow: "0 10px 34px rgba(11,31,42,.10)",
              border: "1px solid #E6EDF1",
              aspectRatio: "148 / 210",
              padding: "22px 24px 18px",
              printColorAdjust: "exact",
              WebkitPrintColorAdjust: "exact",
            }}
          >
            {/* En-tête */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" style={{ maxHeight: 38, maxWidth: 120, objectFit: "contain", marginBottom: 4 }} />
                ) : null}
                <div
                  className="text-[15px] font-extrabold leading-[1.2] text-[#0B1F2A]"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}
                >
                  {clinicName}
                </div>
                <div className="mt-1 text-[10px] font-medium leading-[1.5] text-[#6B818D]" style={{ overflowWrap: "anywhere" }}>
                  {structure?.address ?? "Adresse de la structure"}
                  <br />
                  {structure?.phone ? `Tél. ${structure.phone}` : "Tél. —"}
                </div>
              </div>

              <div className="w-[124px] shrink-0 text-right text-[10px] leading-[1.55] text-[#4B5F6B]">
                <div className="font-semibold">{today}</div>
                <div className="font-bold text-[#0B1F2A]">N° {number}</div>
                <div className="mt-1.5 border-t border-[#E2EAEF] pt-1.5">
                  <div className="truncate text-[12px] font-extrabold text-[#0B1F2A]" title={[patient, ageLabel].filter(Boolean).join(", ")}>
                    {patient.trim() || "—"}{ageLabel ? `, ${ageLabel}` : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Titre */}
            <div className="mt-4 border-y border-[#E2EAEF] py-2 text-center">
              <div className="text-[16px] font-extrabold tracking-[4px] text-[#0B1F2A]">ORDONNANCE</div>
              <div className="mt-0.5 text-[9.5px] font-semibold tracking-[1.5px] text-[#8CA1AC]">MÉDECIN PRESCRIPTEUR</div>
            </div>

            {/* Lignes */}
            <div className="mt-3 flex flex-1 flex-col gap-0 overflow-hidden">
              {lines.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <p className="text-[11px] font-semibold text-[#A9BAC3]">Les lignes prescrites apparaîtront ici.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {lines.map((l, i) => (
                    <div key={l.key} className="flex items-start gap-2 border-b border-[#F1F5F7] py-[7px] text-[11.5px] leading-[1.35] last:border-b-0">
                      <span className="w-[14px] shrink-0 font-extrabold text-[#0B5F54]">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[#0B1F2A]" style={{ overflowWrap: "anywhere" }}>{l.label}</div>
                        <div className="mt-[1px] text-[10px] font-medium text-[#6B818D]">
                          {l.dose}{l.quantity ? ` · Qté ${l.quantity}` : ""}{l.cotation ? ` · Cotation ${l.cotation}` : ""}
                        </div>
                      </div>
                      <span className="shrink-0 whitespace-nowrap pt-[1px] text-[10.5px] font-bold text-[#0B1F2A]">
                        {l.duration}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature */}
            <div className="mt-2 flex justify-end">
              <div className="w-[170px] max-w-[60%] border-t border-[#C7D6DE] pt-1 text-right text-[9.5px] font-semibold text-[#6B818D]">
                Signature et cachet
              </div>
            </div>

            <div className="mt-2 text-center text-[9.5px] font-bold leading-[1.4] text-[#1A4FA0]">
              Veuillez rapporter l&apos;ordonnance au prochain rendez-vous !!!
            </div>
          </section>

          <button
            type="button"
            onClick={handlePrint}
            disabled={lines.length === 0 || saving}
            className="go no-print"
            style={{ height: 54, opacity: lines.length === 0 ? 0.55 : 1 }}
          >
            {saving ? "Enregistrement…" : "Imprimer l'ordonnance"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="no-print w-full rounded-[16px] border-[1.5px] border-[#D5E0E6] bg-white py-3 text-[13.5px] font-bold text-[#0B1F2A] transition-colors hover:border-[#B9CBD3] hover:bg-[#F7FAFB]"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </>
  );
}
