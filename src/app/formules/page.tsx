import Link from "next/link";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { PLAN_FEATURES } from "@/lib/plan-features";

const getPublicPlans = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("subscription_plans")
      .select("id, name, monthly_price, duration_days, max_cashiers, max_docteurs, is_unlimited, max_documents_per_month, features")
      .eq("active", true)
      .eq("is_public", true)
      .order("monthly_price", { ascending: true });
    return data ?? [];
  },
  ["public-plans-details"],
  { revalidate: 60, tags: ["plans"] },
);

export default async function FormulesPubliquesPage() {
  const plans = await getPublicPlans();
  return (
    <main className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Nos formules d&apos;abonnement</h1>
          <p className="scr-sub">Choisissez la formule adaptée à votre structure. Essai gratuit de 7 jours offert à l&apos;inscription.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <section id="essai-gratuit" className="card flex flex-col gap-4">
            <h2 className="text-xl font-extrabold text-ink">Essai gratuit 7 jours</h2>
            <p className="text-3xl font-extrabold text-accent">0 F <span className="text-sm font-semibold text-muted">/ 7 jours</span></p>
            <p className="text-sm text-muted">Sans formule, sans engagement. Découvrez la plateforme pendant 7 jours avant de choisir une formule.</p>
            <ul className="space-y-2 text-sm">
              {["Création de tickets", "Factures", "Historique et caisse", "Impression thermique 80/58 mm", "Réglages de la structure"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-ink"><span className="text-accent">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/inscription" className="btn-primary mt-auto text-center">Commencer l&apos;essai</Link>
          </section>
          {plans.map((p) => (
            <section key={p.id} id={p.name.toLowerCase().replace(/\s+/g, "-")} className="card flex flex-col gap-4">
              <h2 className="text-xl font-extrabold text-ink">{p.name}</h2>
              <p className="text-3xl font-extrabold text-accent">
                {p.monthly_price.toLocaleString("fr-FR")} F <span className="text-sm font-semibold text-muted">/ mois</span>
              </p>
              <p className="text-sm text-muted">
                {p.is_unlimited
                  ? "Utilisateurs illimités"
                  : `${p.max_cashiers ?? 0} caissier(s) · ${p.max_docteurs ?? 0} docteur(s)`}
              </p>
              <p className="text-sm text-muted">
                {p.max_documents_per_month
                  ? `${p.max_documents_per_month.toLocaleString("fr-FR")} tickets + factures / mois`
                  : "Documents illimités"}
              </p>
              <ul className="space-y-2 text-sm">
                {(p.features ?? []).map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-ink">
                    <span className="text-accent">✓</span>
                    {PLAN_FEATURES.find((x) => x.value === f)?.label ?? f}
                  </li>
                ))}
              </ul>
              <Link href="/inscription" className="btn-primary mt-auto text-center">
                Choisir {p.name}
              </Link>
            </section>
          ))}
        </div>
        <div className="flex justify-center pt-2">
          <Link
            href="/inscription"
            className="btn-secondary inline-flex items-center gap-2"
            style={{ height: 44, padding: "0 20px", borderRadius: 12, fontSize: 13 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Retour à l&apos;inscription
          </Link>
        </div>
      </div>
    </main>
  );
}
