const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(url, key);
const items = [
  { dci: "DOSTINEX", brand: "DOSTINEX", dosage: "0,5 mg", form: "comprimé" },
  { dci: "SPIRIVA", brand: "SPIRIVA", dosage: "18 µg", form: "gélule" },
  { dci: "ATROVENT", brand: "ATROVENT", dosage: "0,5 mg", form: "nébulisation" },
  { dci: "ZYVOXID", brand: "ZYVOXID", dosage: "600 mg", form: "comprimé" },
  { dci: "ASAQ", brand: "ASAQ", dosage: "25/67,5 mg", form: "comprimé" },
];
(async () => {
  let added = 0;
  for (const it of items) {
    const { data: exists } = await supabase.from("medications").select("id").ilike("dci", it.dci).limit(1);
    if (exists?.length) continue;
    const { error } = await supabase.from("medications").insert({ ...it, class: "AMM" });
    if (error) console.error(it.dci, error.message); else added++;
  }
  const q = "'";
  const esc = (s) => String(s || "").split(q).join(q + q);
  const sql = items.map(it => `INSERT INTO public.medications (dci, brand, class, form, dosage) SELECT '${esc(it.dci)}', '${esc(it.brand)}', 'AMM', '${esc(it.form)}', '${esc(it.dosage)}' WHERE NOT EXISTS (SELECT 1 FROM public.medications WHERE lower(dci)=lower('${esc(it.dci)}'));`).join("\n");
  fs.writeFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/web_research.sql", sql);
  console.log("Ajoutés:", added);
})();
