const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const url = "http://127.0.0.1:54321";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(url, key);

function parseCSV(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;
  for (let c = 0; c < text.length; c++) {
    const ch = text[c];
    if (inQuotes) {
      if (ch === '"') {
        if (text[c+1] === '"') { field += '"'; c++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ""; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === '\r') { /* skip */ }
      else field += ch;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

(async () => {
  const text = fs.readFileSync("C:/Users/NCM/Downloads/liste-medicaments-par-maladie.csv", "utf8");
  const rows = parseCSV(text);
  const header = rows[0];
  const idx = (name) => header.indexOf(name);
  const iCat = idx("Catégorie");
  const iMed = idx("Médicament (DCI)");
  const iForm = idx("Forme et dosage courant");
  const iAlt = idx("Alternatives");

  const { data: existing } = await supabase.from("medications").select("id, dci, form");
  const byKey = new Map();
  const byDci = new Map();
  for (const m of existing || []) {
    byKey.set((m.dci + "||" + (m.form || "")).toLowerCase(), m.id);
    if (!byDci.has(m.dci.toLowerCase())) byDci.set(m.dci.toLowerCase(), m.id);
  }

  let inserted = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 3) continue;
    const cat = (row[iCat] || "").trim();
    const med = (row[iMed] || "").trim();
    const form = (row[iForm] || "").trim();
    if (!med || med === "—" || cat === "Hors catalogue") continue;

    const key = (med + "||" + form).toLowerCase();
    let id = byKey.get(key);
    if (!id) {
      const { data, error } = await supabase.from("medications").insert({
        dci: med, brand: null, class: cat || "Autre", form: form || "—", dosage: null,
      }).select("id").single();
      if (error) { console.error("insert med error", med, error.message); continue; }
      id = data.id;
      byKey.set(key, id);
      if (!byDci.has(med.toLowerCase())) byDci.set(med.toLowerCase(), id);
      inserted++;
    }
  }

  let altCount = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const med = (row[iMed] || "").trim();
    const altStr = (row[iAlt] || "").trim();
    if (!med || !altStr || altStr === "—") continue;
    const medId = byDci.get(med.toLowerCase());
    if (!medId) continue;
    const alts = altStr.split(/[;,\n]/).map(s => s.trim()).filter(s => s && s !== "—");
    for (const a of alts) {
      const altId = byDci.get(a.toLowerCase());
      if (!altId || altId === medId) continue;
      const { error } = await supabase.from("medication_alternatives").insert({
        medication_id: medId, alternative_id: altId, relation: "same_class", note: null,
      });
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        console.error("alt error", med, a, error.message);
      } else if (!error) altCount++;
    }
  }

  console.log("Médicaments ajoutés:", inserted);
  console.log("Alternatives insérées:", altCount);
})();
