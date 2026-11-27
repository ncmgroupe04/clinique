const { createClient } = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY; if (!key) { console.error("SUPABASE_SERVICE_KEY manquante"); process.exit(1); }
const supabase = createClient(url, key);
(async () => {
  const { data: found } = await supabase.from("medications").select("id").ilike("dci", "Tot'héma").limit(1);
  if (found?.length) { console.log("Déjà présent"); return; }
  const { error } = await supabase.from("medications").insert({
    dci: "Tot'héma", brand: "Tot'héma", class: "Homéopathie", form: "comprimé", dosage: null,
  });
  console.log(error ? error.message : "Ajouté");
})();
