"use client";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ブロック中/ミュート中の一覧管理ページ
export default function BlockedMutedPage() {
  const { data, mutate } = useSWR("/api/me/blocks", fetcher);

  const unblock = async (username: string) => {
    await fetch(`/api/users/${username}/block`, { method: "POST" });
    mutate();
  };
  const unmute = async (username: string) => {
    await fetch(`/api/users/${username}/mute`, { method: "POST" });
    mutate();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <Link href="/settings" className="text-sm accent hover:underline">← 設定に戻る</Link>
      </div>
      <div>
        <h2 className="text-lg font-bold mb-2">ブロック中のユーザー</h2>
        <div className="card divide-y divide-app">
          {data?.blocked?.length === 0 && <div className="text-muted text-sm py-2">なし</div>}
          {data?.blocked?.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between py-2">
              <Link href={`/profile/${u.username}`} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full accent-bg flex items-center justify-center font-bold text-white text-sm">{u.displayName?.[0]}</div>
                <span>@{u.username}</span>
              </Link>
              <button onClick={() => unblock(u.username)} className="btn-ghost text-sm border border-app">解除</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-bold mb-2">ミュート中のユーザー</h2>
        <div className="card divide-y divide-app">
          {data?.muted?.length === 0 && <div className="text-muted text-sm py-2">なし</div>}
          {data?.muted?.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between py-2">
              <Link href={`/profile/${u.username}`} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full accent-bg flex items-center justify-center font-bold text-white text-sm">{u.displayName?.[0]}</div>
                <span>@{u.username}</span>
              </Link>
              <button onClick={() => unmute(u.username)} className="btn-ghost text-sm border border-app">解除</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
