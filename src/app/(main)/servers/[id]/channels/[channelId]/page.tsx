"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Hash, Send, Plus, Users } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { timeAgo } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ChannelPage() {
  const params = useParams();
  const serverId = params?.id as string;
  const channelId = params?.channelId as string;
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id;

  const { data: server, mutate: mutateServer } = useSWR(`/api/servers/${serverId}`, fetcher);
  const { data: messages, mutate } = useSWR(`/api/channels/${channelId}/messages`, fetcher);
  const [text, setText] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [showMembers, setShowMembers] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentChannel = server?.channels?.find((c: any) => c.id === channelId);
  const isOwner = server?.ownerId === meId;

  useEffect(() => {
    const s = getSocket();
    s.emit("join:channel", channelId);
    const onNew = (msg: any) => { if (msg.channelId === channelId) mutate(); };
    s.on("channel:new", onNew);
    return () => { s.emit("leave:channel", channelId); s.off("channel:new", onNew); };
  }, [channelId, mutate]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    const res = await fetch(`/api/channels/${channelId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const msg = await res.json();
    if (res.ok) {
      setText("");
      mutate();
      getSocket().emit("channel:send", { channelId, message: msg });
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    await fetch(`/api/servers/${serverId}/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChannelName }),
    });
    setNewChannelName("");
    setShowNewChannel(false);
    mutateServer();
  };

  if (!server) return <div className="p-8 text-muted">読み込み中...</div>;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* チャンネルリスト */}
      <aside className="w-60 bg-secondary flex flex-col">
        <div className="p-3 border-b border-app font-bold shadow-sm truncate">{server.name}</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <div className="flex items-center justify-between text-xs text-muted uppercase px-2 pt-2 pb-1">
            <span>テキストチャンネル</span>
            {isOwner && (
              <button onClick={() => setShowNewChannel(true)} className="hover:text-primary" title="追加"><Plus size={14} /></button>
            )}
          </div>
          {server.channels.map((c: any) => (
            <Link key={c.id} href={`/servers/${serverId}/channels/${c.id}`}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm truncate
                ${c.id === channelId ? "bg-tertiary text-primary" : "text-muted hover:bg-tertiary/60 hover:text-primary"}`}>
              <Hash size={16} /> {c.name}
            </Link>
          ))}
        </div>
      </aside>

      {/* メイン */}
      <section className="flex-1 flex flex-col bg-primary">
        <header className="border-b border-app p-3 flex items-center gap-2">
          <Hash size={20} className="text-muted" />
          <div className="font-bold">{currentChannel?.name}</div>
          <button onClick={() => setShowMembers(!showMembers)} className="ml-auto text-muted hover:text-primary" title="メンバー">
            <Users size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages?.length === 0 && <div className="text-muted text-center">#{currentChannel?.name} の最初のメッセージを送信しよう</div>}
          {messages?.map((m: any) => (
            <div key={m.id} className="flex gap-3 hover:bg-secondary/40 p-1 rounded">
              <div className="w-9 h-9 rounded-full accent-bg flex items-center justify-center text-white font-bold shrink-0">
                {m.user.displayName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <Link href={`/profile/${m.user.username}`} className="font-medium hover:underline">{m.user.displayName}</Link>
                  <span className="text-xs text-muted">{timeAgo(m.createdAt)}</span>
                </div>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-app flex gap-2">
          <input className="input flex-1" placeholder={`#${currentChannel?.name} にメッセージを送信`} value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="btn" onClick={send}><Send size={16} /></button>
        </div>
      </section>

      {/* メンバー */}
      {showMembers && (
        <aside className="w-60 bg-secondary border-l border-app p-3 overflow-y-auto">
          <div className="text-xs text-muted uppercase mb-2">メンバー — {server.members.length}</div>
          {server.members.map((m: any) => (
            <Link key={m.id} href={`/profile/${m.user.username}`}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-tertiary text-sm">
              <div className="w-8 h-8 rounded-full accent-bg flex items-center justify-center font-bold text-white">{m.user.displayName?.[0]}</div>
              <div className="truncate">
                <div className="truncate">{m.user.displayName}</div>
                <div className="text-xs text-muted truncate">{m.role}</div>
              </div>
            </Link>
          ))}
        </aside>
      )}

      {showNewChannel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewChannel(false)}>
          <div className="card w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">新しいチャンネルを作成</h3>
            <input className="input mb-3" placeholder="チャンネル名" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} autoFocus />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setShowNewChannel(false)}>キャンセル</button>
              <button className="btn" onClick={createChannel}>作成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
