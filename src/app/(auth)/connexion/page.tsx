import AuthScreen from "../auth-screen";
import { getPublicPlans } from "@/lib/public-plans";

export default async function ConnexionPage() {
  const plans = await getPublicPlans();
  return <AuthScreen initialMode="login" plans={plans} />;
}
