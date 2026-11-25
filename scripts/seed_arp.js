const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const url = "http://127.0.0.1:54321";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
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
