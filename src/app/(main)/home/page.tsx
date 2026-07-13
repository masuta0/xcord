"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import { getSocket } from "@/lib/socket";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HomePage() {
  const [scope, setScope] = useState<"all" | "following">("all");
  const { data: posts, mutate } = useSWR(`/api/posts?scope=${scope}`, fetcher);

  useEffect(() => {
    const s = getSocket();
    const onNew = () => mutate();
    s.on("post:new", onNew);
    return () => { s.off("post:new", onNew); };
  }, [mutate]);

  return (
    <div className="flex-1 overflow-hidden flex">
      <div className="flex-1 overflow-y-auto border-r border-app">
        <header className="sticky top-0 bg-primary/90 backdrop-blur border-b border-app z-10">
          <div className="px-4 pt-3 font-bold text-xl">ホーム</div>
          <div className="flex">
            <TabBtn active={scope === "all"} onClick={() => setScope("all")}>すべて</TabBtn>
            <TabBtn active={scope === "following"} onClick={() => setScope("following")}>フォロー中</TabBtn>
          </div>
        </header>
        <PostComposer onPosted={() => mutate()} />
        {posts?.length === 0 && <div className="p-8 text-center text-muted">まだ投稿がありません</div>}
        {posts?.map((p: any) => <PostCard key={p.id} post={p} onDelete={() => mutate()} />)}
      </div>
      <RightSidebar />
    </div>
  );
}

function TabBtn({ active, children, onClick }: any) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-3 text-sm font-medium hover:bg-secondary/60 transition-colors relative
        ${active ? "text-primary" : "text-muted"}`}>
      {children}
      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 accent-bg rounded-full" />}
    </button>
  );
}

function RightSidebar() {
  const [q, setQ] = useState("");
  const { data } = useSWR(q.length > 0 ? `/api/users/search?q=${encodeURIComponent(q)}` : null, fetcher);
  return (
    <aside className="w-80 p-4 overflow-y-auto hidden lg:block">
      <div className="card">
        <div className="font-bold mb-2">検索</div>
        <input className="input" placeholder="ユーザーを検索" value={q} onChange={(e) => setQ(e.target.value)} />
        {data && data.length > 0 && (
          <div className="mt-2 space-y-1">
            {data.map((u: any) => (
              <a key={u.id} href={`/profile/${u.username}`} className="flex items-center gap-2 p-2 rounded hover:bg-tertiary">
                <div className="w-8 h-8 rounded-full accent-bg flex items-center justify-center text-sm font-bold">{u.displayName?.[0]}</div>
                <div className="text-sm">
                  <div>{u.displayName}</div>
                  <div className="text-muted text-xs">@{u.username}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
