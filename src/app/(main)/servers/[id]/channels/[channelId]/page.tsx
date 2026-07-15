"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Hash, Send, Plus, Users, Volume2, Mic, MicOff, Video, VideoOff, PhoneOff, Headphones, Trash2 } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { timeAgo } from "@/lib/utils";
import MentionText from "@/components/MentionText";
import ImageUploadButton from "@/components/ImageUploadButton";
import ReactionBar, { aggregateReactions } from "@/components/ReactionBar";
import { useVoiceChannel } from "@/hooks/useVoiceChannel";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ChannelPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params?.id as string;
  const channelId = params?.channelId as string;
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id;
  const meName = session?.user?.name || "";

  const { data: server, mutate: mutateServer } = useSWR(`/api/servers/${serverId}`, fetcher);
  const currentChannel = server?.channels?.find((c: any) => c.id === channelId);
  const isVoice = currentChannel?.type === "voice";

  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");
  const [showMembers, setShowMembers] = useState(true);
  const isOwner = server?.ownerId === meId;

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    await fetch(`/api/servers/${serverId}/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChannelName, type: newChannelType }),
    });
    setNewChannelName("");
    setShowNewChannel(false);
    mutateServer();
  };

  const deleteServer = async () => {
    if (!confirm(`「${server?.name}」を削除しますか? この操作は取り消せません。`)) return;
    const res = await fetch(`/api/servers/${serverId}`, { method: "DELETE" });
    if (res.ok) router.push("/home");
  };

  if (!server) return <div className="p-8 text-muted">読み込み中...</div>;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* チャンネルリスト */}
      <aside className="w-60 bg-secondary flex flex-col">
        <div className="p-3 border-b border-app font-bold shadow-sm truncate flex items-center justify-between gap-2">
          <span className="truncate">{server.name}</span>
          {isOwner && (
            <button onClick={deleteServer} className="text-muted hover:text-red-400 shrink-0" title="サーバーを削除">
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <ChannelGroup title="テキストチャンネル" channels={server.channels.filter((c: any) => c.type === "text")}
            serverId={serverId} channelId={channelId} isOwner={isOwner} onAdd={() => { setNewChannelType("text"); setShowNewChannel(true); }} />
          <ChannelGroup title="ボイスチャンネル" channels={server.channels.filter((c: any) => c.type === "voice")}
            serverId={serverId} channelId={channelId} isOwner={isOwner} onAdd={() => { setNewChannelType("voice"); setShowNewChannel(true); }} voice />
        </div>
      </aside>

      {/* メイン */}
      {isVoice ? (
        <VoiceChannelPanel channelId={channelId} channelName={currentChannel.name} meId={meId} meName={meName} />
      ) : (
        <TextChannelPanel channelId={channelId} channelName={currentChannel?.name} showMembers={showMembers} setShowMembers={setShowMembers} />
      )}

      {/* メンバー */}
      {showMembers && !isVoice && (
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
            <h3 className="font-bold mb-3">新しい{newChannelType === "voice" ? "ボイス" : "テキスト"}チャンネルを作成</h3>
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

function ChannelGroup({ title, channels, serverId, channelId, isOwner, onAdd, voice }: any) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted uppercase px-2 pt-2 pb-1">
        <span>{title}</span>
        {isOwner && <button onClick={onAdd} className="hover:text-primary" title="追加"><Plus size={14} /></button>}
      </div>
      {channels.map((c: any) => (
        <Link key={c.id} href={`/servers/${serverId}/channels/${c.id}`}
          className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm truncate
            ${c.id === channelId ? "bg-tertiary text-primary" : "text-muted hover:bg-tertiary/60 hover:text-primary"}`}>
          {voice ? <Volume2 size={16} /> : <Hash size={16} />} {c.name}
        </Link>
      ))}
    </div>
  );
}

function TextChannelPanel({ channelId, channelName, showMembers, setShowMembers }: any) {
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id;
  const { data: messages, mutate } = useSWR(`/api/channels/${channelId}/messages`, fetcher);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getSocket();
    s.emit("join:channel", channelId);
    const onNew = (msg: any) => { if (msg.channelId === channelId) mutate(); };
    const onReaction = () => mutate();
    s.on("channel:new", onNew);
    s.on("channel:reaction", onReaction);
    return () => { s.emit("leave:channel", channelId); s.off("channel:new", onNew); s.off("channel:reaction", onReaction); };
  }, [channelId, mutate]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() && images.length === 0) return;
    const res = await fetch(`/api/channels/${channelId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, images }),
    });
    const data = await res.json();
    if (res.ok) {
      setText(""); setImages([]);
      mutate();
      const { _notif, ...msg } = data;
      getSocket().emit("channel:send", { channelId, message: msg });
      if (_notif?.recipients?.length) {
        for (const uid of _notif.recipients) {
          getSocket().emit("notify", {
            to: uid,
            notification: {
              type: "channel_message",
              actor: { id: msg.user.id, username: msg.user.username, displayName: msg.user.displayName, avatarUrl: msg.user.avatarUrl },
              serverId: _notif.serverId,
              entityId: _notif.channelId,
              contextLabel: _notif.contextLabel,
              preview: _notif.preview,
              createdAt: new Date().toISOString(),
              read: false,
            },
          });
        }
      }
    }
  };

  const react = async (messageId: string, emoji: string) => {
    const res = await fetch(`/api/channels/${channelId}/messages/${messageId}/reaction`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }),
    });
    const data = await res.json();
    if (res.ok) { mutate(); getSocket().emit("channel:reaction", { channelId, data }); }
  };

  return (
    <section className="flex-1 flex flex-col bg-primary">
      <header className="border-b border-app p-3 flex items-center gap-2">
        <Hash size={20} className="text-muted" />
        <div className="font-bold">{channelName}</div>
        <button onClick={() => setShowMembers(!showMembers)} className="ml-auto text-muted hover:text-primary" title="メンバー">
          <Users size={18} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages?.length === 0 && <div className="text-muted text-center">#{channelName} の最初のメッセージを送信しよう</div>}
        {messages?.map((m: any) => {
          const reactions = aggregateReactions(m.reactions, meId);
          return (
            <div key={m.id} className="flex gap-3 hover:bg-secondary/40 p-1 rounded">
              <div className="w-9 h-9 rounded-full accent-bg flex items-center justify-center text-white font-bold shrink-0">
                {m.user.displayName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <Link href={`/profile/${m.user.username}`} className="font-medium hover:underline">{m.user.displayName}</Link>
                  <span className="text-xs text-muted">{timeAgo(m.createdAt)}</span>
                </div>
                <MentionText content={m.content} />
                {m.images?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {m.images.map((img: string, i: number) => (
                      <img key={i} src={img} className="max-w-[220px] max-h-[220px] rounded-lg object-cover" alt="" />
                    ))}
                  </div>
                )}
                <ReactionBar reactions={reactions} onToggle={(emoji) => react(m.id, emoji)} />
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-app space-y-2">
        <ImageUploadButton images={images} setImages={setImages} />
        <div className="flex gap-2">
          <input className="input flex-1" placeholder={`#${channelName} にメッセージを送信 (@でメンション)`} value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="btn" onClick={send}><Send size={16} /></button>
        </div>
      </div>
    </section>
  );
}

function VoiceChannelPanel({ channelId, channelName, meId, meName }: any) {
  const { joined, localStream, peers, videoEnabled, audioEnabled, join, leave, toggleVideo, toggleAudio } = useVoiceChannel();
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  // チャンネル切替時に自動退出
  useEffect(() => () => { if (joined) leave(); }, [channelId]); // eslint-disable-line

  return (
    <section className="flex-1 flex flex-col bg-primary">
      <header className="border-b border-app p-3 flex items-center gap-2">
        <Volume2 size={20} className="text-muted" />
        <div className="font-bold">{channelName}</div>
        <span className="text-muted text-sm ml-2">{peers.length + (joined ? 1 : 0)}人が参加中</span>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {joined && (
            <div className="relative aspect-video bg-tertiary rounded-lg overflow-hidden flex items-center justify-center">
              {videoEnabled ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full accent-bg flex items-center justify-center text-white text-xl font-bold">{meName?.[0]?.toUpperCase()}</div>
              )}
              <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">{meName} (あなた)</span>
              {!audioEnabled && <MicOff size={14} className="absolute top-2 right-2 text-red-400" />}
            </div>
          )}
          {peers.map((p) => (
            <PeerTile key={p.socketId} peer={p} />
          ))}
        </div>
        {!joined && (
          <div className="text-center text-muted mt-10">
            <Volume2 size={40} className="mx-auto mb-3 opacity-50" />
            まだ誰もボイスチャンネルに参加していません
          </div>
        )}
      </div>

      <div className="p-4 border-t border-app flex items-center justify-center gap-3">
        {!joined ? (
          <>
            <button onClick={() => join(channelId, meId, meName, false)} className="btn flex items-center gap-2">
              <Headphones size={16} /> 音声のみで参加
            </button>
            <button onClick={() => join(channelId, meId, meName, true)} className="btn flex items-center gap-2">
              <Video size={16} /> ビデオ付きで参加
            </button>
          </>
        ) : (
          <>
            <button onClick={toggleAudio} className={`w-11 h-11 rounded-full flex items-center justify-center ${audioEnabled ? "bg-secondary" : "bg-red-500 text-white"}`}>
              {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button onClick={toggleVideo} className={`w-11 h-11 rounded-full flex items-center justify-center ${videoEnabled ? "bg-secondary" : "bg-tertiary text-muted"}`}>
              {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
            <button onClick={leave} className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
              <PhoneOff size={18} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function PeerTile({ peer }: { peer: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current && peer.stream) videoRef.current.srcObject = peer.stream; }, [peer.stream]);
  return (
    <div className="relative aspect-video bg-tertiary rounded-lg overflow-hidden flex items-center justify-center">
      {peer.video && peer.stream ? (
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-16 h-16 rounded-full accent-bg flex items-center justify-center text-white text-xl font-bold">{peer.name?.[0]?.toUpperCase()}</div>
      )}
      <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">{peer.name}</span>
    </div>
  );
}
