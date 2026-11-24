import { createServiceClient } from "@/lib/supabase/server";
import AuthScreen from "../auth-screen";

export default async function InscriptionPage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("subscription_plans")
    .select("id, name, monthly_price, registration_fee")
    .eq("active", true)
    .order("created_at", { ascending: true });

  return <AuthScreen initialMode="signup" plans={data ?? []} />;
}
