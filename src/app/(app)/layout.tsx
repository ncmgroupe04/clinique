import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import SidebarNav from "./sidebar-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const user = await requireUser();
  return (
    <div className="flex min-h-screen bg-bg">
      <SidebarNav role={user.role} />
      <main className="flex min-w-0 flex-1 flex-col px-6 py-6 lg:px-10 lg:py-9">{children}</main>
    </div>
  );
}
