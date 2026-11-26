import { connection } from "next/server";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { updatePlatformSetting } from "@/app/actions/platform";
import ScreenHeader from "../../screen-header";

const SETTINGS = [
  { key: "platform_name", label: "Nom de la plateforme", placeholder: "Tickets de caisse" },
  { key: "currency", label: "Devise", placeholder: "F CFA" },
  { key: "vat_rate", label: "Taux de TVA (%)", placeholder: "0" },
  { key: "support_email", label: "E-mail du support", placeholder: "support@exemple.sn" },
  { key: "default_plan", label: "Formule par défaut (id)", placeholder: "—" },
];

export default async function ParametresPage() {
  await connection();
  await requireRole("platform_admin");
  const supabase = createServiceClient();
  const { data } = await supabase.from("platform_settings").select("key, value");
  const values = new Map((data ?? []).map((s) => [s.key, s.value]));

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Paramètres globaux" subtitle="Valeurs appliquées à l'ensemble de la plateforme." />

      <section className="card flex flex-col gap-4">
        {SETTINGS.map((s) => (
          <form key={s.key} action={updatePlatformSetting} className="flex flex-wrap items-end gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
            <input type="hidden" name="key" value={s.key} />
            <div className="min-w-[260px] flex-1">
              <label className="lbl" htmlFor={`set-${s.key}`}>{s.label}</label>
              <input id={`set-${s.key}`} name="value" defaultValue={values.get(s.key) ?? ""} placeholder={s.placeholder} className="input" />
            </div>
            <button type="submit" className="btn-secondary" style={{ height: 42, padding: "0 16px", borderRadius: 12, fontSize: 13, width: "auto" }}>Enregistrer</button>
          </form>
        ))}
      </section>
    </div>
  );
}
