import AuthScreen from "../auth-screen";
import { getPublicPlans } from "@/lib/public-plans";

export default async function InscriptionPage() {
  const plans = await getPublicPlans();
  return <AuthScreen initialMode="signup" plans={plans} />;
}
