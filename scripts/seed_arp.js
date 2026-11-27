const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321"; const key = process.env.SUPABASE_SERVICE_KEY; if (!key) { console.error("SUPABASE_SERVICE_KEY manquante"); process.exit(1); }
const supabase = createClient(url, key);

const src = "C:\\Users\\NCM\\.cache\\opencode\\browser-exports\\655f0999e04af153b01ec4b60ea4f584d715dc615008ddde1b4892b8e869abab\\078218f6-6d1a-4c64-825e-2518cc57753e\\0\\arp_dcis.json";
const names = JSON.parse(fs.readFileSync(src, "utf8"));

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
  console.log("Ajoutés:", added, "Ignorés:", skipped, "Total traités:", names.length);
})();
