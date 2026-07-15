"use client";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Home, Users, Bell, Mail, Settings, LogOut, Compass, Hash } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SidebarNav({ uiMode = "hybrid" }: { uiMode?: string }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { data: notifs } = useSWR("/api/notifications", fetcher, { refreshInterval: 15000 });
  const unread = notifs?.filter((n: any) => !n.read).length || 0;

  const inServer = pathname?.startsWith("/servers/");
  if (inServer) return null;

  const isX = uiMode === "x";

  return (
    <aside className={`flex flex-col ${isX ? "w-20 xl:w-64" : "w-64"} bg-secondary`}>
      <div className="px-4 py-3 border-b border-app font-bold text-lg flex items-center gap-2">
        {isX ? <span className="text-2xl">𝕏</span> : <Hash size={20} />}
        <span className={isX ? "hidden xl:inline" : ""}>{isX ? "SocialHub" : "SocialHub"}</span>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <NavItem href="/home" icon={<Home size={20} />} label="ホーム" active={pathname === "/home"} compact={isX} />
        <NavItem href="/explore" icon={<Compass size={20} />} label="探索" active={pathname === "/explore"} compact={isX} />
        <NavItem href="/notifications" icon={<Bell size={20} />} label="通知" active={pathname?.startsWith("/notifications")} badge={unread} compact={isX} />
        <NavItem href="/dm" icon={<Mail size={20} />} label="ダイレクトメッセージ" active={pathname?.startsWith("/dm")} compact={isX} />
        <NavItem href={`/profile/${session?.user?.name}`} icon={<Users size={20} />} label="プロフィール" active={pathname?.startsWith("/profile")} compact={isX} />
        <NavItem href="/settings" icon={<Settings size={20} />} label="設定" active={pathname === "/settings"} compact={isX} />
        {session?.user?.isAdmin && (
          <NavItem href="/admin" icon={<Settings size={20} />} label="管理画面" active={pathname === "/admin"} compact={isX} />
        )}
      </nav>
      <div className="p-3 border-t border-app flex items-center gap-2">
        <div className="w-8 h-8 rounded-full accent-bg flex items-center justify-center text-white text-sm font-bold shrink-0">
          {session?.user?.name?.[0]?.toUpperCase()}
        </div>
        <div className={`flex-1 text-sm truncate ${isX ? "hidden xl:block" : ""}`}>
          <div className="font-medium text-primary truncate">{session?.user?.name}</div>
          <div className="text-muted text-xs">オンライン</div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-muted hover:text-red-400" title="ログアウト">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

function NavItem({ href, icon, label, active, badge, compact }: any) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
      ${active ? "bg-tertiary text-primary" : "text-muted hover:bg-tertiary hover:text-primary"}`}>
      {icon}
      <span className={`flex-1 ${compact ? "hidden xl:inline" : ""}`}>{label}</span>
      {badge > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{badge}</span>}
    </Link>
  );
}
