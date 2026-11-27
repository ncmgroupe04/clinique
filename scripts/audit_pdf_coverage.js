const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321"; const key = process.env.SUPABASE_SERVICE_KEY; if (!key) { console.error("SUPABASE_SERVICE_KEY manquante"); process.exit(1); }
const supabase = createClient(url, key);
(async () => {
  let all = [];
  for (let start = 0; ; start += 1000) {
    const { data } = await supabase.from("medications").select("id, dci").range(start, start + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  const existing = new Set(all.map((m) => m.dci.toLowerCase()));
  const raw = fs.readFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/pdf_drugs.txt", "utf8").split("\n").filter(Boolean);
  const rejected = fs.readFileSync("data/noms-corrompus-pdf.txt", "utf8").split("\n").filter(Boolean);
  const already = raw.filter((n) => existing.has(n.toLowerCase()));
  console.log("Catalogue total:", all.length);
  console.log("Candidats PDF retenus:", raw.length, "dont déjà présents:", already.length);
  console.log("Rejetés corrompus:", rejected.length);
})();
