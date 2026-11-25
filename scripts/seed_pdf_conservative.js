const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(url, key);

const stop = new Set(["Acide","Alcool","Citrate","Bicarbonate","Eosine","Chibroxine","Anexate","Adalate","Cordarone","Cortisone","Brufen","Ascabiol","Actrapid","Aldactone","Aldactazine","Aldomet","Alvogyl","Aline","Anti","Candsartan","Diazpam","Dogravir","Carbamazpine","Carbocysine","Dexathasone","Dexchlorpniramine","Cyclosrine","CaprǸomycine","Clobtasone","Clonazpam","Dropridol","CilastatineAmoxicilline","ClavulaniqueAmoxicilline","ClavulaniqueTotapenBenzathine","EfavirenzTǸnofovir","EmtricitabineTǸnofovir","DǸcapeptylFolinate","AVPAcǸtate","Anti-apnǸiquesCitrate"]);

(async () => {
  const candidates = fs.readFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/pdf_drugs.txt", "utf8").split("\n").filter(Boolean);
  let all = [];
  for (let start = 0; ; start += 1000) {
    const { data } = await supabase.from("medications").select("id, dci").range(start, start + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  const existing = new Set(all.map((m) => m.dci.toLowerCase()));
  const toAdd = candidates.filter((c) => !stop.has(c) && !existing.has(c.toLowerCase()) && c.length >= 5);
  let added = 0;
  for (const c of toAdd) {
    const { error } = await supabase.from("medications").insert({ dci: c, brand: null, class: "LNMPE", form: "—", dosage: null });
    if (error) console.error("insert", c, error.message); else added++;
  }
  fs.writeFileSync("C:/Users/NCM/AppData/Local/Temp/opencode/pdf_added.txt", toAdd.join("\n"));
  console.log("Candidats:", candidates.length, "Ajoutés:", added);
})();
