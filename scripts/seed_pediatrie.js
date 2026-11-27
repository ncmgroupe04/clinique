const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY; if (!key) { console.error("SUPABASE_SERVICE_KEY manquante"); process.exit(1); }
const supabase = createClient(url, key);

const items = [
  ["Paracétamol", null, "100 mg/5 ml", "sirop", "Antalgique"],
  ["Paracétamol", null, "125 mg/5 ml", "sirop", "Antalgique"],
  ["Amoxicilline", null, "125 mg/5 ml", "sirop", "Antibiotique"],
  ["Amoxicilline", null, "250 mg/5 ml", "sirop", "Antibiotique"],
  ["Azithromycine", null, "100 mg/5 ml", "sirop", "Antibiotique"],
  ["Azithromycine", null, "200 mg/5 ml", "sirop", "Antibiotique"],
  ["Cotrimoxazole", null, "40 mg/8 ml", "sirop", "Antibiotique"],
  ["Cefixime", null, "100 mg/5 ml", "sirop", "Antibiotique"],
  ["Métronidazole", null, "125 mg/5 ml", "sirop", "Antibiotique"],
  ["Albendazole", null, "100 mg/5 ml", "suspension", "Anthelminthique"],
  ["Ibuprofène", null, "100 mg/5 ml", "sirop", "AINS"],
  ["Salbutamol", null, "2 mg/5 ml", "sirop", "Bronchodilatateur"],
  ["Carbocystéine", null, "2 %", "sirop", "Fluidifiant"],
  ["Dompéridone", null, "1 mg/ml", "sirop", "Antiémétique"],
  ["Prednisolone", null, "5 mg/5 ml", "sirop", "Corticoïde"],
  ["Fer", null, "50 mg/5 ml", "sirop", "Antianémique"],
  ["Zinc", null, "20 mg", "comprimé dispersible", "Antidiarrhéique"],
  ["Sels de réhydratation orale", null, "sachet", "poudre", "Réhydration"],
  ["Vitamine A", null, "100 000 UI", "capsule", "Vitamine"],
  ["Artéméther + Luméfantrine", null, "20 mg/120 mg", "comprimé dispersible", "Antipaludéen"],
  ["Artésunate + Amodiaquine", null, "25 mg/67,5 mg", "comprimé dispersible", "Antipaludéen"],
];
(async () => {
  let added = 0;
  for (const [dci, brand, dosage, form, cls] of items) {
    const { data: found } = await supabase.from("medications").select("id").ilike("dci", dci).ilike("dosage", dosage).limit(1);
    if (found?.length) continue;
    const { error } = await supabase.from("medications").insert({ dci, brand, dosage, form, class: cls });
    if (error) console.error(dci, error.message); else added++;
  }
  const q = "'";
  const esc = (s) => s === null ? "NULL" : "'" + String(s).replace(q, q+q) + "'";
  const sql = items.map(([dci, brand, dosage, form, cls]) => `INSERT INTO public.medications (dci, brand, class, form, dosage) SELECT ${esc(dci)}, ${esc(brand)}, ${esc(cls)}, ${esc(form)}, ${esc(dosage)} WHERE NOT EXISTS (SELECT 1 FROM public.medications m WHERE lower(m.dci)=lower(${esc(dci)}) AND lower(coalesce(m.dosage,''))=lower(${esc(dosage)}));`).join("\n");
  fs.writeFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/pediatrie.sql", sql);
  console.log("Ajoutés:", added);
})();
