"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import PostCard from "@/components/PostCard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ExplorePage() {
  const [q, setQ] = useState("");
  const { data: users } = useSWR(q ? `/api/users/search?q=${encodeURIComponent(q)}` : null, fetcher);
  const { data: posts, mutate } = useSWR("/api/posts?scope=all", fetcher);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <header className="font-bold text-xl">探索</header>
      <input className="input" placeholder="ユーザー名で検索..." value={q} onChange={(e) => setQ(e.target.value)} />
      {q && users && (
        <div className="card">
          <div className="font-bold mb-2">ユーザー</div>
          {users.length === 0 ? (
            <div className="text-muted text-sm">見つかりませんでした</div>
          ) : (
            users.map((u: any) => (
              <Link key={u.id} href={`/profile/${u.username}`} className="flex items-center gap-2 p-2 rounded hover:bg-tertiary">
                <div className="w-9 h-9 rounded-full accent-bg flex items-center justify-center font-bold text-white">{u.displayName?.[0]}</div>
                <div>
                  <div>{u.displayName}</div>
                  <div className="text-muted text-xs">@{u.username}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
      <div>
        <div className="font-bold mb-2">最新の投稿</div>
        {posts?.map((p: any) => <PostCard key={p.id} post={p} onDelete={() => mutate()} />)}
      </div>
    </div>
  );
}
