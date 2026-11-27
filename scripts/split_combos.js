const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY; if (!key) { console.error("SUPABASE_SERVICE_KEY manquante"); process.exit(1); }
const supabase = createClient(url, key);

function clean(s) {
  return s
    .replace(/^\s+|\s+$/g, "")
    .replace(/[.;,]+$/g, "")
    .replace(/\s*[—–-]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

(async () => {
  // Fetch all meds
  let all = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.from("medications").select("id, dci").range(start, start + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
  }

  const combos = all.filter((m) => /[+\/]/.test(m.dci));
  const existing = new Set(all.map((m) => m.dci.toLowerCase()));
  const toInsert = new Map();
  for (const m of combos) {
    for (const raw of m.dci.split(/[+\/]/)) {
      const part = clean(raw);
      if (part.length < 2 || /^\d+$/.test(part)) continue;
      if (existing.has(part.toLowerCase())) continue;
      if (!toInsert.has(part.toLowerCase())) toInsert.set(part.toLowerCase(), part);
    }
  }

  let inserted = 0;
  for (const [, part] of toInsert) {
    const { error } = await supabase.from("medications").insert({
      dci: part, brand: null, class: "Autre", form: "—", dosage: null,
    });
    if (error) console.error("insert error", part, error.message);
    else inserted++;
  }

  // Delete compound rows that are not referenced by prescriptions
  const comboIds = combos.map((m) => m.id);
  const { data: refs } = await supabase.from("prescription_items").select("medication_id").in("medication_id", comboIds);
  const referenced = new Set((refs || []).map((r) => r.medication_id));
  const deletable = comboIds.filter((id) => !referenced.has(id));
  let deleted = 0;
  for (let i = 0; i < deletable.length; i += 100) {
    const batch = deletable.slice(i, i + 100);
    const { error } = await supabase.from("medications").delete().in("id", batch);
    if (error) console.error("delete error", error.message);
    else deleted += batch.length;
  }

  fs.writeFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/split_report.json", JSON.stringify({ total: all.length, combos: combos.length, inserted, deleted }, null, 2));
  console.log("Total:", all.length, "Composés:", combos.length, "Ajoutés:", inserted, "Supprimés:", deleted);
})();
