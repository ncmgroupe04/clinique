import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import ScreenHeader from "../../screen-header";
import InscriptionsClient from "./inscriptions-client";

export default async function InscriptionsPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "platform_admin") redirect("/tableau");

  const supabase = createServiceClient();
  const { data: structures } = await supabase
    .from("structures")
    .select("id, name, created_at, active, suspended, registration_fee_paid, subscription_ends_at, address, phone, header_text")
    .order("created_at", { ascending: false });

  const enriched = await Promise.all(
    (structures ?? []).map(async (s) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("structure_id", s.id)
        .eq("role", "structure_admin")
        .limit(1)
        .maybeSingle();
      let email = "";
      if (profile?.id) {
        const { data } = await supabase.auth.admin.getUserById(profile.id);
        email = data?.user?.email ?? "";
      }
      return { ...s, email };
    }),
  );

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Inscriptions"
        subtitle="Validation des nouvelles demandes."
      />
      <InscriptionsClient structures={enriched} />
    </div>
  );
}
