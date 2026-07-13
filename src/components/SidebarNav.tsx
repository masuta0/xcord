"use client";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Home, Users, Bell, Mail, Settings, LogOut, Search, Compass } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SidebarNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { data: notifs } = useSWR("/api/notifications", fetcher, { refreshInterval: 15000 });
  const unread = notifs?.filter((n: any) => !n.read).length || 0;

  // サーバーページ内ではチャンネル一覧を出したいが、そのUIはページ側で用意する
  const inServer = pathname?.startsWith("/servers/");
  if (inServer) return null; // サーバー画面ではこのナビは隠す(サーバー詳細ページ側で独自ナビを表示)

  return (
    <aside className="w-64 bg-secondary flex flex-col">
      <div className="px-4 py-3 border-b border-app font-bold text-lg">SocialHub</div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <NavItem href="/home" icon={<Home size={18} />} label="ホーム" active={pathname === "/home"} />
        <NavItem href="/explore" icon={<Compass size={18} />} label="探索" active={pathname === "/explore"} />
        <NavItem href="/notifications" icon={<Bell size={18} />} label="通知" active={pathname?.startsWith("/notifications")} badge={unread} />
        <NavItem href="/dm" icon={<Mail size={18} />} label="ダイレクトメッセージ" active={pathname?.startsWith("/dm")} />
        <NavItem href={`/profile/${session?.user?.name}`} icon={<Users size={18} />} label="プロフィール" active={pathname?.startsWith("/profile")} />
        <NavItem href="/settings" icon={<Settings size={18} />} label="設定" active={pathname === "/settings"} />
        {session?.user?.isAdmin && (
          <NavItem href="/admin" icon={<Settings size={18} />} label="管理画面" active={pathname === "/admin"} />
        )}
      </nav>
      <div className="p-3 border-t border-app flex items-center gap-2">
        <div className="w-8 h-8 rounded-full accent-bg flex items-center justify-center text-white text-sm font-bold">
          {session?.user?.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 text-sm truncate">
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

function NavItem({ href, icon, label, active, badge }: any) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
      ${active ? "bg-tertiary text-primary" : "text-muted hover:bg-tertiary hover:text-primary"}`}>
      {icon}
      <span className="flex-1">{label}</span>
      {badge > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{badge}</span>}
    </Link>
  );
}
