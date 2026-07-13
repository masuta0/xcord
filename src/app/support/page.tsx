"use client";
import { useState } from "react";
import Link from "next/link";

export default function SupportPage() {
  const [username, setUsername] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [ticketId, setTicketId] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, contactInfo, reason }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus("sent");
      setTicketId(data.ticketId);
    } else setStatus("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="w-full max-w-lg card space-y-4">
        <h1 className="text-2xl font-bold">パスワード復旧の申請</h1>
        <p className="text-sm text-muted">
          メールアドレスを使わないため、管理者による本人確認後にパスワードをリセットします。<br />
          以下のフォームに詳細を記入してください。
        </p>
        {status === "sent" ? (
          <div className="space-y-3">
            <div className="p-4 rounded bg-green-500/20 text-green-400">
              ✅ 申請を受け付けました。<br />
              チケットID: <code className="bg-tertiary px-1 rounded">{ticketId}</code>
              <br />
              管理者からの連絡をお待ちください。
            </div>
            <Link href="/login" className="btn inline-block">ログイン画面に戻る</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm text-muted mb-1">ユーザー名 *</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">連絡先 (SNSアカウント/DiscordID等)</label>
              <input className="input" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="X: @xxx / Discord: xxxx#0000" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">本人証明のヒント *</label>
              <textarea className="input min-h-[120px]" value={reason} onChange={(e) => setReason(e.target.value)} required
                placeholder="登録日/最後にログインした日/よくやり取りするユーザー名/最後の投稿内容など、本人であることを示す情報" />
            </div>
            {status === "error" && <div className="text-red-400 text-sm">送信に失敗しました</div>}
            <button className="btn w-full">申請を送信</button>
            <div className="text-center">
              <Link href="/login" className="text-sm accent hover:underline">ログインに戻る</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
