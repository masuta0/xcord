"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DMListPage() {
  const { data, mutate } = useSWR("/api/dm", fetcher, { refreshInterval: 10000 });
  const [q, setQ] = useState("");
  const { data: users } = useSWR(q ? `/api/users/search?q=${encodeURIComponent(q)}` : null, fetcher);

  useEffect(() => {
    const handler = () => mutate();
    window.addEventListener("app:notification", handler);
    return () => window.removeEventListener("app:notification", handler);
  }, [mutate]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 border-r border-app overflow-y-auto">
        <header className="p-3 font-bold text-lg border-b border-app">ダイレクトメッセージ</header>
        <div className="p-3 border-b border-app">
          <input className="input" placeholder="ユーザーを検索して新規DM" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && users?.length > 0 && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {users.map((u: any) => (
                <Link key={u.id} href={`/dm/${u.id}`} className="flex items-center gap-2 p-2 rounded hover:bg-tertiary">
                  <div className="w-8 h-8 rounded-full accent-bg flex items-center justify-center text-sm font-bold">{u.displayName?.[0]}</div>
                  <div className="text-sm">
                    <div>{u.displayName}</div>
                    <div className="text-muted text-xs">@{u.username}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          {data?.length === 0 && <div className="p-4 text-muted text-sm">会話履歴はありません</div>}
          {data?.map((c: any) => (
            <Link key={c.partner.id} href={`/dm/${c.partner.id}`}
              className="flex items-center gap-3 p-3 hover:bg-secondary border-b border-app">
              <div className="w-10 h-10 rounded-full accent-bg flex items-center justify-center text-white font-bold">
                {c.partner.displayName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className="font-medium truncate">{c.partner.displayName}</span>
                  <span className="text-xs text-muted">{timeAgo(c.lastMessage.createdAt)}</span>
                </div>
                <div className="text-sm text-muted truncate">{c.lastMessage.content}</div>
              </div>
              {c.unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{c.unreadCount}</span>}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted">
        左のリストから会話を選んでください
      </div>
    </div>
  );
}
