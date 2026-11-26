import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  diabete: ["metformine", "insuline", "glibenclamide", "gliclazide", "glimépiride", "antidiabétique", "hypoglycémiant", "acarbose", "sitagliptine"],
  paludisme: ["artéméther", "artésunate", "amodiaquine", "pipéraquine", "quinine", "sulfadoxine", "pyriméthamine", "primaquine", "atovaquone", "proguanil", "antipaludéen", "fansidar", "coartem"],
  cardio: ["amlodipine", "hydrochlorothiazide", "énalapril", "captopril", "losartan", "valsartan", "aténolol", "bisoprolol", "furosémide", "spironolactone", "digoxine", "amiodarone", "antihypertenseur", "bêtabloquant", "statin", "atorvastatine", "simvastatine"],
  antibiotiques: ["amoxicilline", "azithromycine", "ciprofloxacine", "ceftriaxone", "céfalexine", "cotrimoxazole", "métronidazole", "doxycycline", "gentamicine", "érythromycine", "clarithromycine", "pénicilline", "céphalosporine", "antibiotique", "vancomycine", "clindamycine"],
  douleur: ["paracétamol", "ibuprofène", "diclofénac", "tramadol", "aspirine", "néfopam", "antalgique", "AINS", "morphine", "codéine"],
  digestif: ["oméprazole", "pantoprazole", "ésoméprazole", "métoclopramide", "lactulose", "lopéramide", "réhydratation", "zinc", "antiacide", "dompéridone", "ondansétron", "phloroglucinol"],
  respiratoire: ["salbutamol", "béclométasone", "budésonide", "terbutaline", "ambroxol", "carbocystéine", " antitussif", "théophylline", "montélukast", "ipratropium"],
  grossesse: ["ocytocine", "misoprostol", "sulfate de magnésium", "acide folique", "lévonorgestrel", "noréthistérone", "dépo", "contraceptif", "progestérone", "fer"],
  dermato: ["miconazole", "clotrimazole", "kétoconazole", "perméthrine", "benzoate de benzyle", "bétaméthasone", "hydrocortisone", "antifongique", "dermocorticoïde", "ivermectine", "griséofulvine"],
  fievre: ["paracétamol", "doliprane", "efferalgan", "perfalgan", "ibuprofène", "antipyrétique", "fièvre", "aspirine"],
  dentiste: ["lidocaïne", "articaïne", "mépivacaïne", "alvogyl", "oxyde de zinc", "pulperyl", "chlorhexidine", "bain de bouche", "fluorure", "dentaire", "carpules"],
  ophtalmo: ["collyre", "timolol", "latanoprost", "tobramycine", "chloramphénicol", "atropine", "tropicamide", "ranibizumab", "fluorescéine", "cyclopentolate", "picloxydine", "cromoglycate"],
  orl: ["otipax", "xylométazoline", "cétirizine", "loratadine", "bétahistine", "auriculaire", "nasale", "sinusite", "gorge"],
  vih: ["antirétroviral", "ténofovir", "lamivudine", "dolutégravir", "éfavirenz", "névirapine", "ritonavir", "atazanavir", "darunavir", "abacavir", "emtricitabine", "trithérapie"],
  tuberculose: ["rifampicine", "isoniazide", "pyrazinamide", "éthambutol", "bédaquiline", "linézolide", "antituberculeux", "streptomycine"],
  lepre: ["dapsone", "clofazimine", "rifampicine", "antilépreux"],
  parasitoses: ["albendazole", "mébendazole", "praziquantel", "ivermectine", "métronidazole", "anthelminthique", "antiamibien", "bilharziose", "vers"],
  vitamines: ["vitamine", "acide ascorbique", "acide folique", "cyanocobalamine", "pyridoxine", "thiamine", "rétinol", "calciférol", " Calcium", "zinc", "fer"],
  urologie: ["tamsulosine", "finastéride", "oxybutynine", "nitrofurantoïne", "fosfomycine", "sildénafil", "prostate", "vésical", "cystite"],
  rhumatologie: ["colchicine", "allopurinol", "fébuxostat", "méthotrexate", "hydroxychloroquine", "sulfasalazine", "prednisolone", "goutte", "polyarthrite"],
  neurologie: ["phénobarbital", "carbamazépine", "valproate", "lévétiracétam", "diazépam", "clonazépam", "antiépileptique", "épilepsie", "migraine"],
  psychiatric: ["amitriptyline", "fluoxétine", "sertraline", "halopéridol", "chlorpromazine", "rispéridone", "olanzapine", "antidépresseur", "antipsychotique"],
  oncologie: ["méthotrexate", "cyclophosphamide", "doxorubicine", "cisplatine", "paclitaxel", "tamoxifène", "fluorouracil", "vincristine", "bevacizumab", "trastuzumab", "anticancéreux", "chimiothérapie"],
  endocrino: ["lévothyroxine", "carbimazole", "propylthiouracile", "hydrocortisone", "prednisone", "insuline", "thyroïde", "cortisone"],
  hematologie: ["fer", "folate", "acide folique", "cyanocobalamine", "érythropoïétine", "héparine", "warfarine", "clopidogrel", "anémie", "hémorragie"],
  vaccins: ["vaccin", "bcg", "rougeole", "fièvre jaune", "méningite", "pneumocoque", "polio", "tétanos", "rage", "pentavalent", "papillomavirus"],
  urgences: ["adrénaline", "naloxone", "morphine", "atropine", "glucagon", "diazépam", "nicardipine", "urgence", "réanimation"],
  contraception: ["lévonorgestrel", "étonogestrel", "contraceptif", "préservatif", "diu", "norlevo", "dépo", "microgynon", "jadelle", "implanon"],
  homeopathie: ["homéopathie", "tot'héma", "arnica", "nux vomica", "belladonna", "aconitum", "gentiane"],
  enfant: ["sirop", "suspension", "dispersible", "nourrisson", "enfant", "pédiatrique", "100 mg/5 ml", "125 mg/5 ml", "250 mg/5 ml", "sro", "zinc", "vitamine a", "gouttes"],
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const category = params.get("category") ?? "";
  if (!q && !category) return NextResponse.json({ medications: [] });

  const supabase = await createClient();
  let query = supabase
    .from("medications")
    .select("id, dci, brand, class, form, dosage")
    .eq("is_active", true);

  if (q) {
    const escaped = q.replace(/[%,()]/g, " ");
    query = query.or(`dci.ilike.%${escaped}%,brand.ilike.%${escaped}%,class.ilike.%${escaped}%,form.ilike.%${escaped}%`);
  }
  if (category && CATEGORY_KEYWORDS[category]) {
    const parts = CATEGORY_KEYWORDS[category]
      .map((k) => `dci.ilike.%${k}%,brand.ilike.%${k}%,class.ilike.%${k}%,form.ilike.%${k}%`)
      .join(",");
    query = query.or(parts);
  }

  const { data } = await query.order("dci").limit(q ? 60 : 20);
  const rows = data ?? [];

  // Sans recherche texte, l'ordre alphabétique suffit.
  if (!q) return NextResponse.json({ medications: rows });

  // Classement par pertinence : le nom qui commence par la saisie passe avant
  // les simples correspondances au milieu du mot (ex. « para » → Paracétamol
  // avant Adlipara-sp).
  const needle = q.toLowerCase();
  const words = (value: string) => value.split(/[\s/+]+/).filter(Boolean);
  const rank = (m: (typeof rows)[number]) => {
    const dci = m.dci.toLowerCase();
    const brand = (m.brand ?? "").toLowerCase();
    if (dci === needle || brand === needle) return 0;
    if (dci.startsWith(needle)) return 1;
    if (brand.startsWith(needle)) return 2;
    if (words(dci).some((w) => w.startsWith(needle))) return 3;
    if (words(brand).some((w) => w.startsWith(needle))) return 4;
    return 5;
  };

  const medications = rows
    .map((m) => ({ m, r: rank(m) }))
    .sort((a, b) => a.r - b.r || a.m.dci.length - b.m.dci.length || a.m.dci.localeCompare(b.m.dci))
    .slice(0, 20)
    .map((x) => x.m);

  return NextResponse.json({ medications });
}