const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321"; const key = process.env.SUPABASE_SERVICE_KEY; if (!key) { console.error("SUPABASE_SERVICE_KEY manquante"); process.exit(1); }
const supabase = createClient(url, key);

const names = JSON.parse(fs.readFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/docx_names.json", "utf8"));

(async () => {
  const { data: existing } = await supabase.from("medications").select("id, dci");
  const existingSet = new Set((existing || []).map(m => m.dci.toLowerCase()));
  let added = 0, skipped = 0;
  for (const n of names) {
    if (existingSet.has(n.toLowerCase())) { skipped++; continue; }
    const { error } = await supabase.from("medications").insert({
      dci: n, brand: null, class: "Autre", form: "—", dosage: null,
    });
    if (error) { console.error("err", n, error.message); }
    else { added++; existingSet.add(n.toLowerCase()); }
  }
  console.log("Ajoutés:", added, "Ignorés (déjà présents):", skipped);
})();
