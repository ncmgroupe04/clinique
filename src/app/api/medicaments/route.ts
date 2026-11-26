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
    query = query.or(`dci.ilike.%${escaped}%,brand.ilike.%${escaped}%,class.ilike.%${escaped}%`);
  }
  if (category && CATEGORY_KEYWORDS[category]) {
    const parts = CATEGORY_KEYWORDS[category]
      .map((k) => `dci.ilike.%${k}%,brand.ilike.%${k}%,class.ilike.%${k}%`)
      .join(",");
    query = query.or(parts);
  }

  const { data } = await query.order("dci").limit(20);
  return NextResponse.json({ medications: data ?? [] });
}