const { createClient } = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(url, key);
(async () => {
  const { data: found } = await supabase.from("medications").select("id").ilike("dci", "Tot'héma").limit(1);
  if (found?.length) { console.log("Déjà présent"); return; }
  const { error } = await supabase.from("medications").insert({
    dci: "Tot'héma", brand: "Tot'héma", class: "Homéopathie", form: "comprimé", dosage: null,
  });
  console.log(error ? error.message : "Ajouté");
})();
