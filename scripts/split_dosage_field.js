const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY; if (!key) { console.error("SUPABASE_SERVICE_KEY manquante"); process.exit(1); }
const supabase = createClient(url, key);

(async () => {
  let all = [];
  for (let start = 0; ; start += 1000) {
    const { data } = await supabase.from("medications").select("id, dci, brand, class, form, dosage").range(start, start + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  const dosageRe = /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g|ui|iu|ml|%)(?:\/[a-z]+)?/gi;
  const toInsert = [];
  const toDelete = [];
  const seen = new Set(all.map((m) => `${m.dci.toLowerCase()}||${String(m.dosage).toLowerCase()}`));

  for (const m of all) {
    if (!m.dosage) continue;
    const tokens = [...String(m.dosage).matchAll(dosageRe)].map((x) => x[0].trim());
    if (tokens.length < 2) continue;
    for (const t of tokens) {
      const k = `${m.dci.toLowerCase()}||${t.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      toInsert.push({ dci: m.dci, brand: m.brand, class: m.class, form: m.form, dosage: t });
    }
    toDelete.push(m.id);
  }

  let added = 0;
  for (const item of toInsert) {
    const { error } = await supabase.from("medications").insert(item);
    if (error) console.error("insert", item.dci, item.dosage, error.message); else added++;
  }
  const { data: refs } = await supabase.from("prescription_items").select("medication_id").in("medication_id", toDelete);
  const referenced = new Set((refs || []).map((r) => r.medication_id));
  let deleted = 0;
  for (const id of toDelete) {
    if (referenced.has(id)) continue;
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) console.error("delete", id, error.message); else deleted++;
  }
  fs.writeFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/dosage_split.json", JSON.stringify(toInsert, null, 2));
  console.log("Sources:", toDelete.length, "Lignes créées:", toInsert.length, "Ajoutées:", added, "Supprimées:", deleted);
})();
