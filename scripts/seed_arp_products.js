const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY; if (!key) { console.error("SUPABASE_SERVICE_KEY manquante"); process.exit(1); }
const supabase = createClient(url, key);

const src = "C:\\Users\\NCM\\.cache\\opencode\\browser-exports\\655f0999e04af153b01ec4b60ea4f584d715dc615008ddde1b4892b8e869abab\\1f8bbf62-deae-455e-9d3c-07c51e3a15b0\\0\\arp_products.json";
const records = JSON.parse(fs.readFileSync(src, "utf8"));

function clean(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

(async () => {
  // Build unique product lines: "Nom commercial (DCI)" + dosage + forme
  const products = new Map();
  for (const r of records) {
    const brand = clean(r.brand);
    const dci = clean(r.dci);
    if (!dci) continue;
    const label = brand && brand.toUpperCase() !== dci.toUpperCase() ? `${brand} (${dci})` : dci;
    const key = label.toLowerCase();
    if (!products.has(key)) products.set(key, { label, brand: brand || null, dosage: clean(r.dosage) || null });
  }

  let all = [];
  for (let start = 0; ; start += 1000) {
    const { data } = await supabase.from("medications").select("id, dci").range(start, start + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  const existing = new Set(all.map((m) => m.dci.toLowerCase()));

  let added = 0, skipped = 0;
  for (const [, p] of products) {
    if (existing.has(p.label.toLowerCase())) { skipped++; continue; }
    const { error } = await supabase.from("medications").insert({
      dci: p.label, brand: p.brand, class: "AMM", form: "—", dosage: p.dosage,
    });
    if (error) console.error("insert", p.label, error.message);
    else added++;
  }
  console.log("Produits uniques:", products.size, "Ajoutés:", added, "Ignorés:", skipped);

  // Generate SQL for production
  const q = "'";
  const esc = (s) => String(s || "").split(q).join(q + q);
  const sql = [];
  for (const [, p] of products) {
    const label = esc(p.label);
    const brand = p.brand ? esc(p.brand) : "NULL";
    const dosage = p.dosage ? esc(p.dosage) : "NULL";
    sql.push(`INSERT INTO public.medications (dci, brand, class, form, dosage) SELECT '${label}', ${brand === "NULL" ? "NULL" : "'" + brand + "'"}, 'AMM', '—', ${dosage === "NULL" ? "NULL" : "'" + dosage + "'"} WHERE NOT EXISTS (SELECT 1 FROM public.medications WHERE lower(dci)=lower('${label}'));`);
  }
  fs.writeFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/arp_products.sql", sql.join("\n"));
})();
