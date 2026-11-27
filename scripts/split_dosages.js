const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY; if (!key) { console.error("SUPABASE_SERVICE_KEY manquante"); process.exit(1); }
const supabase = createClient(url, key);

function clean(s) { return String(s || "").replace(/[\s.;,–—-]+$/g, "").replace(/\s+/g, " ").trim(); }

(async () => {
  let all = [];
  for (let start = 0; ; start += 1000) {
    const { data } = await supabase.from("medications").select("id, dci, brand, class, form, dosage").range(start, start + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  const existing = new Set(all.map((m) => m.dci.toLowerCase()));
  const dosageRe = /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g|ui|iu|ml|%)(?:\/[a-z]+)?/gi;
  const toInsert = new Map();
  const toDelete = [];

  for (const m of all) {
    const dci = clean(m.dci);
    const tokens = [...dci.matchAll(dosageRe)].map((x) => x[0].trim());
    if (tokens.length < 2) continue;
    const firstIndex = dci.indexOf(tokens[0]);
    const name = dci.slice(0, firstIndex).trim();
    if (name.length < 2) continue;
    for (const t of tokens) {
      const label = `${name} ${t}`;
      if (existing.has(label.toLowerCase())) continue;
      if (!toInsert.has(label.toLowerCase())) {
        toInsert.set(label.toLowerCase(), {
          dci: label, brand: m.brand, class: m.class, form: m.form, dosage: t,
        });
      }
    }
    toDelete.push(m.id);
  }

  let added = 0;
  for (const [, item] of toInsert) {
    const { error } = await supabase.from("medications").insert(item);
    if (error) console.error("insert", item.dci, error.message); else added++;
  }

  const { data: refs } = await supabase.from("prescription_items").select("medication_id").in("medication_id", toDelete);
  const referenced = new Set((refs || []).map((r) => r.medication_id));
  let deleted = 0;
  for (const id of toDelete) {
    if (referenced.has(id)) continue;
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) console.error("delete", id, error.message); else deleted++;
  }

  fs.writeFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/split_dosages.sql", "");
  console.log("Sources multi-dosages:", toDelete.length, "Lignes créées:", toInsert.size, "Ajoutées:", added, "Supprimées:", deleted);
})();
