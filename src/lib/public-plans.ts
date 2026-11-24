import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export type PublicPlan = {
  id: string;
  name: string;
  monthly_price: number;
  duration_days: number;
  max_cashiers: number | null;
  max_docteurs: number | null;
  is_unlimited: boolean;
  max_documents_per_month: number | null;
  features: string[];
};

export const getPublicPlans = unstable_cache(
  async (): Promise<PublicPlan[]> => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("subscription_plans")
      .select("id, name, monthly_price, duration_days, max_cashiers, max_docteurs, is_unlimited, max_documents_per_month, features")
      .eq("active", true)
      .eq("is_public", true)
      .order("monthly_price", { ascending: true });
    return (data ?? []) as PublicPlan[];
  },
  ["public-plans"],
  { revalidate: 60, tags: ["plans"] },
);
