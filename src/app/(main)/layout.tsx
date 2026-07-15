import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarNav from "@/components/SidebarNav";
import ServerRail from "@/components/ServerRail";
import RealtimeConnector from "@/components/RealtimeConnector";
import GlobalCallManager from "@/components/GlobalCallManager";
import UiModeApplier from "@/components/UiModeApplier";
import DiscordToast from "@/components/DiscordToast";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { uiMode: true, theme: true, accentColor: true },
  });
  const uiMode = me?.uiMode || "hybrid";

  return (
    <div className="flex h-screen bg-primary" data-ui-mode={uiMode}>
      <UiModeApplier uiMode={uiMode} theme={me?.theme} accentColor={me?.accentColor} />
      {uiMode !== "x" && <ServerRail />}
      <SidebarNav uiMode={uiMode} />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
      <RealtimeConnector userId={session.user.id} uiMode={uiMode} />
      <GlobalCallManager />
      <DiscordToast />
    </div>
  );
}
