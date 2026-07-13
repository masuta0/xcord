"use client";
import Link from "next/link";
import useSWR from "swr";
import { usePathname } from "next/navigation";
import { Home, Plus, Mail, Bell, Settings } from "lucide-react";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ServerRail() {
  const { data: servers, mutate } = useSWR("/api/servers", fetcher);
  const pathname = usePathname();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");

  const createServer = async () => {
    if (!name.trim()) return;
    await fetch("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setShowCreate(false);
    mutate();
  };

  return (
    <aside className="w-[72px] bg-tertiary flex flex-col items-center py-3 gap-2 overflow-y-auto">
      <RailButton active={pathname === "/home" || pathname?.startsWith("/profile")} href="/home" icon={<Home size={22} />} title="ホーム" />
      <RailButton active={pathname?.startsWith("/dm")} href="/dm" icon={<Mail size={22} />} title="DM" />
      <RailButton active={pathname?.startsWith("/notifications")} href="/notifications" icon={<Bell size={22} />} title="通知" />
      <div className="w-8 h-[2px] bg-secondary rounded my-2" />
      {servers?.map((s: any) => (
        <Link key={s.id} href={`/servers/${s.id}`}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold cursor-pointer transition-all
            ${pathname?.startsWith(`/servers/${s.id}`) ? "accent-bg text-white rounded-xl" : "bg-secondary text-primary hover:accent-bg hover:text-white hover:rounded-xl"}`}
          title={s.name}>
          {s.iconUrl ? <img src={s.iconUrl} className="w-full h-full rounded-2xl object-cover" alt="" /> : s.name.slice(0, 2).toUpperCase()}
        </Link>
      ))}
      <button onClick={() => setShowCreate(true)}
        className="w-12 h-12 rounded-2xl bg-secondary hover:bg-green-600 hover:rounded-xl transition-all flex items-center justify-center text-green-500 hover:text-white"
        title="サーバーを作成">
        <Plus size={22} />
      </button>
      <div className="mt-auto">
        <RailButton active={pathname?.startsWith("/settings")} href="/settings" icon={<Settings size={22} />} title="設定" />
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="card w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">新しいサーバーを作成</h3>
            <input className="input mb-3" placeholder="サーバー名" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>キャンセル</button>
              <button className="btn" onClick={createServer}>作成</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function RailButton({ href, icon, title, active }: any) {
  return (
    <Link href={href} title={title}
      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all
        ${active ? "accent-bg text-white rounded-xl" : "bg-secondary text-muted hover:accent-bg hover:text-white hover:rounded-xl"}`}>
      {icon}
    </Link>
  );
}
