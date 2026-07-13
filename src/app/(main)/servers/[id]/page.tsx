"use client";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useEffect } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// サーバーTOPは最初のチャンネルへリダイレクト
export default function ServerHome() {
  const params = useParams();
  const router = useRouter();
  const { data: server } = useSWR(params?.id ? `/api/servers/${params.id}` : null, fetcher);
  useEffect(() => {
    if (server?.channels?.[0]) {
      router.replace(`/servers/${server.id}/channels/${server.channels[0].id}`);
    }
  }, [server, router]);
  return <div className="p-8 text-muted">読み込み中...</div>;
}
