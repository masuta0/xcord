"use client";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminPage() {
  const { data: session } = useSession();
  const { data: tickets, mutate } = useSWR("/api/support", fetcher);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");

  if (!session?.user?.isAdmin) {
    return <div className="p-8 text-red-400">管理者専用ページです</div>;
  }

  const resolve = async (id: string) => {
    if (newPw.length < 6) { setMsg("6文字以上"); return; }
    const res = await fetch(`/api/support/${id}/resolve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: newPw }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`パスワードをリセットしました: ${data.newPassword}`);
      setNewPw("");
      mutate();
    } else setMsg(data.error);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-4">管理画面 - パスワード復旧チケット</h1>
      {msg && <div className="mb-3 p-2 rounded bg-yellow-500/20 text-yellow-300 text-sm">{msg}</div>}
      <div className="space-y-3">
        {tickets?.length === 0 && <div className="text-muted">チケットはありません</div>}
        {tickets?.map((t: any) => (
          <div key={t.id} className="card">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="font-bold">@{t.username}</div>
                <div className="text-sm text-muted">連絡先: {t.contactInfo || "(未指定)"}</div>
                <div className="text-xs text-muted mt-1">
                  ステータス: <span className={t.status === "open" ? "text-yellow-400" : "text-green-400"}>{t.status}</span> ·
                  {" "}{new Date(t.createdAt).toLocaleString("ja-JP")}
                </div>
              </div>
              <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="btn-ghost text-sm">
                {expanded === t.id ? "閉じる" : "詳細"}
              </button>
            </div>
            {expanded === t.id && (
              <div className="mt-3 space-y-3 pt-3 border-t border-app">
                <div>
                  <div className="text-sm text-muted mb-1">本人証明のヒント</div>
                  <div className="whitespace-pre-wrap bg-tertiary p-2 rounded text-sm">{t.reason}</div>
                </div>
                {t.status === "open" ? (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-sm text-muted">新しい一時パスワード</label>
                      <input className="input" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="例: temp1234" />
                    </div>
                    <button className="btn" onClick={() => resolve(t.id)}>リセット実行</button>
                  </div>
                ) : (
                  <div className="text-sm text-green-400">解決済み: 一時PW = {t.newPassword}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
