"use client";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

// Xモード中にDiscordチャンネルの新着メッセージを受信した際、
// 画面右上に「どこで・誰から」が分かるトーストを一時表示するコンポーネント。
// RealtimeConnector が dispatch する "app:toast" イベントを受け取る。
type ToastItem = { id: number; text: string; kind: string };

export default function DiscordToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let counter = 0;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const id = ++counter;
      setToasts((prev) => [...prev, { id, text: detail.text, kind: detail.kind }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
    };
    window.addEventListener("app:toast", handler);
    return () => window.removeEventListener("app:toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className="card shadow-lg border border-app flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
          <MessageSquare size={18} className="accent shrink-0 mt-0.5" />
          <div className="text-sm leading-snug">{t.text}</div>
        </div>
      ))}
    </div>
  );
}
