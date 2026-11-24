import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProfileActions from "./profile-actions";

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email.split("@")[0] || "??";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`
    : source.slice(0, 2);
  return letters.toUpperCase();
}

export default async function ProfilPage() {
  await connection();
  const user = await requireUser();

  let structureName = "—";
  let planLabel = "—";
  let endDate = "—";
  let paymentStatus = "—";
  if (user.structureId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("structures")
      .select("name, plan_id, subscription_ends_at, registration_fee_paid")
      .eq("id", user.structureId)
      .maybeSingle();
    structureName = data?.name ?? "—";
    const { data: plan } = data?.plan_id
      ? await supabase.from("subscription_plans").select("name, monthly_price").eq("id", data.plan_id).maybeSingle()
      : { data: null };
    planLabel = plan ? `${plan.name} · ${plan.monthly_price.toLocaleString("fr-FR")} F/mois` : "—";
    endDate = data?.subscription_ends_at
      ? new Date(data.subscription_ends_at).toLocaleDateString("fr-FR")
      : "—";
    paymentStatus = data?.registration_fee_paid ? "Payée" : "En attente";
  }

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-extrabold text-white">
          {initials(user.fullName, user.email)}
        </div>
        <div>
          <h1 className="scr-title">Mon profil</h1>
          <p className="scr-sub">Informations du compte administrateur.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="text-lg font-extrabold text-ink">Identité et Structure</h2>
          <div className="mt-5 space-y-4">
            <div className="row"><span>Nom et prénom</span><span className="font-bold text-ink">{user.fullName || "—"}</span></div>
            <div className="row"><span>E-mail</span><span className="font-medium">{user.email}</span></div>
            <div className="row"><span>Rôle</span><span className="font-medium">{user.role === "structure_admin" ? "Administrateur de structure" : user.role}</span></div>
            <div className="row"><span>Structure</span><span className="font-medium">{structureName}</span></div>
            {user.role === "structure_admin" && (
              <>
                <div className="row"><span>Formule</span><span className="font-bold text-accent">{planLabel}</span></div>
                <div className="row"><span>Échéance</span><span className="font-medium">{endDate}</span></div>
                <div className="row"><span>Paiement inscription</span><span className="font-medium">{paymentStatus}</span></div>
              </>
            )}
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-extrabold text-ink">Actions du compte</h2>
          <div className="mt-5">
            <ProfileActions fullName={user.fullName ?? ""} />
          </div>
        </section>
      </div>
    </div>
  );
}
