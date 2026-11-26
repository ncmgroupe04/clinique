const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const url = "http://127.0.0.1:54321";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
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
