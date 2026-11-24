import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../../screen-header";
import AdminStructuresTable from "../admin-client";

export default async function StructuresPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "platform_admin") redirect("/tableau");

  const supabase = createServiceClient();
  const { data: structures } = await supabase
    .from("structures")
    .select("id, name, active, created_at, plan, subscription_ends_at, suspended, registration_fee_paid, plan_id")
    .order("created_at", { ascending: false });

  const { data: counts } = await supabase.from("tickets").select("structure_id");
  const countMap = new Map<string, number>();
  for (const t of counts ?? []) {
    countMap.set(t.structure_id, (countMap.get(t.structure_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Structures"
        subtitle="Toutes les structures inscrites, leurs abonnements et leurs statuts."
      />
      <section className="card">
        <AdminStructuresTable
          structures={(structures ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            active: s.active,
            created_at: s.created_at,
            plan: s.plan,
            subscription_ends_at: s.subscription_ends_at,
            suspended: s.suspended,
            registration_fee_paid: s.registration_fee_paid,
          }))}
          countMap={Object.fromEntries(countMap)}
        />
      </section>
    </div>
  );
}
