import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import SidebarNav from "./sidebar-nav";
import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const user = await requireUser();

  if (user.structureId) {
    const supabase = createServiceClient();
    const { data: structure } = await supabase
      .from("structures")
      .select("active, suspended, subscription_ends_at")
      .eq("id", user.structureId)
      .maybeSingle();
    const now = new Date();
    const expired = structure?.subscription_ends_at
      ? new Date(structure.subscription_ends_at) < now
      : false;
    if (!structure || !structure.active || structure.suspended || expired) {
      redirect("/suspendu");
    }
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <SidebarNav role={user.role} />
      <main className="flex min-w-0 flex-1 flex-col px-6 py-6 lg:px-10 lg:py-9">{children}</main>
    </div>
  );
}
