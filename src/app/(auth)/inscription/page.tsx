import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import AuthScreen from "../auth-screen";

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
  ["public-plans"],
  { revalidate: 60, tags: ["plans"] },
);

export default async function InscriptionPage() {
  const plans = await getPublicPlans();
  return <AuthScreen initialMode="signup" plans={plans} />;
}
