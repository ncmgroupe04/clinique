const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(url, key);

(async () => {
  let all = [];
  for (let start = 0; ; start += 1000) {
    const { data } = await supabase.from("medications").select("id, dci, brand, class, form, dosage").range(start, start + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  const existing = new Set(all.map((m) => m.dci.toLowerCase()));

  // 1) Marques avec parenthesing : garder uniquement le nom commercial
  let renamed = 0;
  const updates = [];
  for (const m of all) {
    if (m.class !== "AMM") continue;
    const i = m.dci.indexOf("(");
    if (i <= 1) continue;
    const brand = m.dci.slice(0, i).trim();
    if (!brand || existing.has(brand.toLowerCase())) continue;
    updates.push({ id: m.id, brand });
  }
  for (const u of updates) {
    const { error } = await supabase.from("medications").update({ dci: u.brand }).eq("id", u.id);
    if (error) console.error("update", u.brand, error.message); else { renamed++; existing.add(u.brand.toLowerCase()); }
  }

  // 2) Lignes sans marque avec listes separees par virgules : eclater
  const inserts = new Map();
  const toDelete = [];
  for (const m of all) {
    if (m.class !== "AMM" || m.dci.includes("(")) continue;
    if (!m.dci.includes(",")) continue;
    for (const raw of m.dci.split(",")) {
      const part = raw.replace(/\s+/g, " ").trim();
      if (part.length < 3 || existing.has(part.toLowerCase())) continue;
      if (!inserts.has(part.toLowerCase())) inserts.set(part.toLowerCase(), part);
    }
    toDelete.push(m.id);
  }
  let added = 0;
  for (const [, part] of inserts) {
    const { error } = await supabase.from("medications").insert({ dci: part, brand: null, class: "AMM", form: "—", dosage: null });
    if (error) console.error("insert", part, error.message); else added++;
  }
  const { data: refs } = await supabase.from("prescription_items").select("medication_id").in("medication_id", toDelete);
  const referenced = new Set((refs || []).map((r) => r.medication_id));
  let deleted = 0;
  for (const id of toDelete) {
    if (referenced.has(id)) continue;
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) console.error("delete", id, error.message); else deleted++;
  }
  console.log("Renommés:", renamed, "Ajoutés:", added, "Supprimés:", deleted);
})();
