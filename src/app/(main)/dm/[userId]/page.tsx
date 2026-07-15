"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Send, Phone, Video } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import MentionText from "@/components/MentionText";
import ImageUploadButton from "@/components/ImageUploadButton";
import ReactionBar, { aggregateReactions } from "@/components/ReactionBar";
import { startOutgoingCall } from "@/components/GlobalCallManager";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DMChatPage() {
  const params = useParams();
  const otherId = params?.userId as string;
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id;
  const meName = session?.user?.name || "";

  const { data: messages, mutate } = useSWR(otherId ? `/api/dm/${otherId}` : null, fetcher);
  const { data: conversations } = useSWR("/api/dm", fetcher);
  const partner = conversations?.find((c: any) => c.partner.id === otherId)?.partner;
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
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
    const onReaction = () => mutate();
    const onTyping = ({ from }: any) => { if (from === otherId) { setTyping(true); setTimeout(() => setTyping(false), 2000); } };
    s.on("dm:new", onNew);
    s.on("dm:reaction", onReaction);
    s.on("dm:typing", onTyping);
    return () => { s.off("dm:new", onNew); s.off("dm:reaction", onReaction); s.off("dm:typing", onTyping); };
  }, [meId, otherId, mutate]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() && images.length === 0) return;
    const res = await fetch(`/api/dm/${otherId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, images }),
    });
    const msg = await res.json();
    if (res.ok) {
      setText(""); setImages([]);
      mutate();
      getSocket().emit("dm:send", { from: meId, to: otherId, message: msg });
    }
  };

  const react = async (messageId: string, emoji: string) => {
    const res = await fetch(`/api/dm/${otherId}/reaction`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
    const data = await res.json();
    if (res.ok) {
      mutate();
      getSocket().emit("dm:reaction", { from: meId, to: otherId, data });
    }
  };

  const call = (video: boolean) => {
    if (!partner) return;
    startOutgoingCall(otherId, partner.displayName, video, meId, meName);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="border-b border-app p-3 flex items-center gap-3">
        <Link href="/dm" className="text-muted hover:text-primary">←</Link>
        <div className="w-9 h-9 rounded-full accent-bg flex items-center justify-center text-white font-bold">
          {partner?.displayName?.[0] || "?"}
        </div>
        <div className="flex-1">
          <div className="font-bold">{partner?.displayName || "会話"}</div>
          <div className="text-xs text-muted">{typing ? "入力中..." : `@${partner?.username || ""}`}</div>
        </div>
        <button onClick={() => call(false)} className="text-muted hover:accent p-2" title="音声通話"><Phone size={18} /></button>
        <button onClick={() => call(true)} className="text-muted hover:accent p-2" title="ビデオ通話"><Video size={18} /></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages?.map((m: any) => {
          const reactions = aggregateReactions(m.reactions, meId);
          return (
            <div key={m.id} className={`flex ${m.senderId === meId ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] px-3 py-2 rounded-2xl ${m.senderId === meId ? "accent-bg text-white" : "bg-secondary"}`}>
                {m.content && <MentionText content={m.content} />}
                {m.images?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {m.images.map((img: string, i: number) => (
                      <img key={i} src={img} className="max-w-[180px] max-h-[180px] rounded-lg object-cover" alt="" />
                    ))}
                  </div>
                )}
                <div className={`text-[10px] mt-1 ${m.senderId === meId ? "text-white/70" : "text-muted"}`}>{timeAgo(m.createdAt)}</div>
                <ReactionBar reactions={reactions} onToggle={(emoji) => react(m.id, emoji)} />
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-app p-3 space-y-2">
        <ImageUploadButton images={images} setImages={setImages} />
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="メッセージを入力..." value={text}
            onChange={(e) => { setText(e.target.value); getSocket().emit("dm:typing", { from: meId, to: otherId }); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="btn" onClick={send}><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
