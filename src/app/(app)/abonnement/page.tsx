import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import RenewalForm from "./renewal-form";
import WaveQr from "./wave-qr";

const WAVE_LINK = "https://pay.wave.com/m/M_RllSqNXcTsCF/c/sn/";

export default async function AbonnementPage() {
  await connection();
  const user = await requireUser();
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const { data: structure } = await supabase
    .from("structures")
    .select("name, plan, subscription_ends_at, renewal_requested, renewal_reference, registration_fee_paid")
    .eq("id", user.structureId)
    .maybeSingle();
  const { data: plans } = await supabase.from("subscription_plans").select("name, monthly_price, registration_fee").eq("active", true);
  const plan = plans?.[0];

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Abonnement" subtitle="Gérez votre formule et renouvelez votre abonnement." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="text-lg font-extrabold text-ink">Votre formule</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[13px] font-semibold text-muted">Formule</p>
              <p className="mt-1 text-xl font-extrabold text-ink">{plan?.name ?? "Standard"}</p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-muted">Prix mensuel</p>
              <p className="mt-1 text-xl font-extrabold text-accent">
                {(plan?.monthly_price ?? 25000).toLocaleString("fr-FR")} F CFA
              </p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-muted">Frais d'inscription</p>
              <p className="mt-1 text-lg font-bold text-ink">
                {(plan?.registration_fee ?? 50000).toLocaleString("fr-FR")} F CFA
              </p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-muted">Échéance</p>
              <p className="mt-1 text-lg font-bold text-ink">
                {structure?.subscription_ends_at
                  ? new Date(structure.subscription_ends_at).toLocaleDateString("fr-FR")
                  : "—"}
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-bg p-4 text-sm text-muted">
            {structure?.renewal_requested
              ? `Paiement déclaré (référence : ${structure.renewal_reference ?? "—"}). En attente de validation par l'administrateur.`
              : "Aucune demande de renouvellement en cours."}
          </div>
          <RenewalForm />
        </section>

        <section className="card flex flex-col items-center gap-4">
          <h2 className="text-lg font-extrabold text-ink">Payer avec Wave</h2>
          <p className="text-center text-sm text-muted">
            Scannez le code QR ou ouvrez le lien pour effectuer le paiement.
          </p>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            {/* QR généré côté client à partir du lien Wave */}
            <WaveQr url={WAVE_LINK} />
          </div>
          <a
            href={WAVE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-center text-sm"
          >
            Ouvrir le lien Wave
          </a>
          <p className="break-all text-center text-xs text-muted">{WAVE_LINK}</p>
        </section>
      </div>
    </div>
  );
}
