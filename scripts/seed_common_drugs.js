const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY; if (!key) { console.error("SUPABASE_SERVICE_KEY manquante"); process.exit(1); }
const supabase = createClient(url, key);

const items = [
  { dci: "PARACETAMOL", brand: null, dosage: "500 mg", form: "comprimé", class: "Antalgique" },
  { dci: "PARACETAMOL", brand: null, dosage: "1 g", form: "comprimé", class: "Antalgique" },
  { dci: "PARACETAMOL", brand: null, dosage: "100 mg/5 ml", form: "sirop", class: "Antalgique" },
  { dci: "PARACETAMOL", brand: null, dosage: "125 mg/5 ml", form: "sirop", class: "Antalgique" },
  { dci: "PARACETAMOL", brand: null, dosage: "200 mg", form: "suppositoire", class: "Antalgique" },
  { dci: "PARACETAMOL", brand: null, dosage: "500 mg", form: "suppositoire", class: "Antalgique" },
  { dci: "DOLIPRANE", brand: "DOLIPRANE", dosage: "500 mg", form: "comprimé", class: "Antalgique" },
  { dci: "DOLIPRANE", brand: "DOLIPRANE", dosage: "1 g", form: "comprimé", class: "Antalgique" },
  { dci: "DOLIPRANE", brand: "DOLIPRANE", dosage: "100 mg/5 ml", form: "sirop", class: "Antalgique" },
  { dci: "EFFERALGAN", brand: "EFFERALGAN", dosage: "500 mg", form: "comprimé", class: "Antalgique" },
  { dci: "EFFERALGAN", brand: "EFFERALGAN", dosage: "1 g", form: "comprimé", class: "Antalgique" },
  { dci: "EFFERALGAN", brand: "EFFERALGAN", dosage: "100 mg/5 ml", form: "sirop", class: "Antalgique" },
  { dci: "EFFERALGAN", brand: "EFFERALGAN", dosage: "300 mg", form: "suppositoire", class: "Antalgique" },
  { dci: "PERFALGAN", brand: "PERFALGAN", dosage: "1 g", form: "injectable", class: "Antalgique" },
  { dci: "AMOXICILLINE", brand: null, dosage: "500 mg", form: "gélule", class: "Antibiotique" },
  { dci: "AMOXICILLINE", brand: null, dosage: "250 mg/5 ml", form: "sirop", class: "Antibiotique" },
  { dci: "AMOXICILLINE + ACIDE CLAVULANIQUE", brand: null, dosage: "500 mg/62,5 mg", form: "comprimé", class: "Antibiotique" },
  { dci: "IBUPROFENE", brand: null, dosage: "400 mg", form: "comprimé", class: "AINS" },
  { dci: "IBUPROFENE", brand: null, dosage: "100 mg/5 ml", form: "sirop", class: "AINS" },
];

(async () => {
  let added = 0, updated = 0;
  for (const it of items) {
    const { data: found } = await supabase.from("medications").select("id, form").ilike("dci", it.dci).ilike("dosage", it.dosage).limit(1);
    if (found?.length) {
      if (found[0].form !== it.form && found[0].form === "—") {
        await supabase.from("medications").update({ form: it.form, class: it.class }).eq("id", found[0].id);
        updated++;
      }
      continue;
    }
    const { error } = await supabase.from("medications").insert(it);
    if (error) console.error("insert", it.dci, error.message); else added++;
  }
  const q = "'";
  const esc = (s) => s === null ? "NULL" : "'" + String(s).replace(q, q+q) + "'";
  const sql = items.map(it => `INSERT INTO public.medications (dci, brand, class, form, dosage) SELECT ${esc(it.dci)}, ${esc(it.brand)}, ${esc(it.class)}, ${esc(it.form)}, ${esc(it.dosage)} WHERE NOT EXISTS (SELECT 1 FROM public.medications m WHERE lower(m.dci)=lower(${esc(it.dci)}) AND lower(coalesce(m.dosage,''))=lower(${esc(it.dosage)}));`).join("\n");
  fs.writeFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/common_drugs.sql", sql);
  console.log("Ajoutés:", added, "Mis à jour:", updated);
})();
