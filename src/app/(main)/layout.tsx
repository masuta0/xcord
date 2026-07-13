import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SidebarNav from "@/components/SidebarNav";
import ServerRail from "@/components/ServerRail";
import RealtimeConnector from "@/components/RealtimeConnector";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen bg-primary">
      <ServerRail />
      <SidebarNav />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
      <RealtimeConnector userId={session.user.id} />
    </div>
  );
}
