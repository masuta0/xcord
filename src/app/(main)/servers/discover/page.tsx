"use client";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Hash, ArrowLeft } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Discordの「サーバーを探す」相当: 未参加の公開サーバー一覧 + 参加
export default function DiscoverServersPage() {
  const router = useRouter();
  const { data: servers, mutate } = useSWR("/api/servers/discover", fetcher);

  const join = async (id: string) => {
    const res = await fetch(`/api/servers/${id}/join`, { method: "POST" });
    if (res.ok) {
      router.push(`/servers/${id}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/home" className="text-muted hover:text-primary"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold">サーバーを探す</h1>
      </div>
      {!servers && <div className="text-muted">読み込み中...</div>}
      {servers?.length === 0 && <div className="text-muted">現在、参加可能な新しいサーバーはありません。左のレールから「+」で新しいサーバーを作成できます。</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        {servers?.map((s: any) => (
          <div key={s.id} className="card flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl accent-bg flex items-center justify-center font-bold text-white shrink-0">
                {s.iconUrl ? <img src={s.iconUrl} className="w-full h-full rounded-2xl object-cover" alt="" /> : s.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{s.name}</div>
                <div className="text-xs text-muted truncate">by @{s.owner?.username}</div>
              </div>
            </div>
            {s.description && <div className="text-sm text-muted line-clamp-2">{s.description}</div>}
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1"><Users size={14} /> {s._count?.members ?? 0}人</span>
              <span className="flex items-center gap-1"><Hash size={14} /> {s._count?.channels ?? 0}チャンネル</span>
            </div>
            <button onClick={() => join(s.id)} className="btn mt-1">参加する</button>
          </div>
        ))}
      </div>
    </div>
  );
}
