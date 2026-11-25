const { createClient } = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(url, key);

(async () => {
  let all = [];
  for (let start = 0; ; start += 1000) {
    const { data } = await supabase.from("medications").select("id, dci").range(start, start + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  let changed = 0;
  for (const m of all) {
    let name = m.dci;
    const i = name.indexOf("(");
    if (i > 1) name = name.slice(0, i);
    name = name.replace(/[\s.;,–—-]+$/g, "").replace(/\s+/g, " ").trim();
    if (!name || name === m.dci) continue;
    const { error } = await supabase.from("medications").update({ dci: name }).eq("id", m.id);
    if (error) console.error("update", name, error.message); else changed++;
  }
  console.log("Modifiés:", changed);
})();
