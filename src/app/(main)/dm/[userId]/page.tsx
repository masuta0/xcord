"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Send } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DMChatPage() {
  const params = useParams();
  const otherId = params?.userId as string;
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id;

  const { data: messages, mutate } = useSWR(otherId ? `/api/dm/${otherId}` : null, fetcher);
  const { data: conversations } = useSWR("/api/dm", fetcher);
  const partner = conversations?.find((c: any) => c.partner.id === otherId)?.partner;
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!meId || !otherId) return;
    const s = getSocket();
    s.emit("join:dm", { a: meId, b: otherId });
    const onNew = (msg: any) => {
      if ((msg.senderId === meId && msg.receiverId === otherId) ||
          (msg.senderId === otherId && msg.receiverId === meId)) {
        mutate();
      }
    };
    s.on("dm:new", onNew);
    return () => { s.off("dm:new", onNew); };
  }, [meId, otherId, mutate]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    const res = await fetch(`/api/dm/${otherId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const msg = await res.json();
    if (res.ok) {
      setText("");
      mutate();
      getSocket().emit("dm:send", { from: meId, to: otherId, message: msg });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="border-b border-app p-3 flex items-center gap-3">
        <Link href="/dm" className="text-muted hover:text-primary">←</Link>
        <div className="w-9 h-9 rounded-full accent-bg flex items-center justify-center text-white font-bold">
          {partner?.displayName?.[0] || "?"}
        </div>
        <div>
          <div className="font-bold">{partner?.displayName || "会話"}</div>
          <div className="text-xs text-muted">@{partner?.username}</div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages?.map((m: any) => (
          <div key={m.id} className={`flex ${m.senderId === meId ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] px-3 py-2 rounded-2xl ${m.senderId === meId ? "accent-bg text-white" : "bg-secondary"}`}>
              <div className="whitespace-pre-wrap break-words">{m.content}</div>
              <div className={`text-[10px] mt-1 ${m.senderId === meId ? "text-white/70" : "text-muted"}`}>{timeAgo(m.createdAt)}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-app p-3 flex gap-2">
        <input className="input flex-1" placeholder="メッセージを入力..." value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="btn" onClick={send}><Send size={16} /></button>
      </div>
    </div>
  );
}
