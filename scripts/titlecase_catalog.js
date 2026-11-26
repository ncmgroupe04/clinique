const { createClient } = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(url, key);

const title = (s) => String(s || "").replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

(async () => {
  let all = [];
  for (let start = 0; ; start += 1000) {
    const { data } = await supabase.from("medications").select("id, dci, brand").range(start, start + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  let changed = 0;
  for (const m of all) {
    const dci = title(m.dci);
    const brand = m.brand ? title(m.brand) : null;
    if (dci === m.dci && brand === m.brand) continue;
    const { error } = await supabase.from("medications").update({ dci, brand }).eq("id", m.id);
    if (error) console.error(error.message); else changed++;
  }
  console.log("Mis en forme:", changed, "sur", all.length);
})();
