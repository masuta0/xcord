"use client";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import PostCard from "@/components/PostCard";
import { getSocket } from "@/lib/socket";
import { startOutgoingCall } from "@/components/GlobalCallManager";
import Link from "next/link";
import { useState } from "react";
import { MoreHorizontal, Phone, Video, MessageCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id;
  const meName = session?.user?.name || "";
  const { data: user, mutate } = useSWR(`/api/users/${username}`, fetcher);
  const { data: posts, mutate: mutatePosts } = useSWR(user ? `/api/posts?scope=user&userId=${user.id}` : null, fetcher);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isMe = meId === user?.id;
  const isFollowing = following ?? user?.isFollowing;

  const toggleFollow = async () => {
    const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setFollowing(data.following);
      if (data.following) getSocket().emit("notify", { to: user.id, notification: { type: "follow" } });
      mutate();
    } else alert(data.error);
  };

  const toggleBlock = async () => {
    const res = await fetch(`/api/users/${username}/block`, { method: "POST" });
    if (res.ok) { mutate(); setMenuOpen(false); }
  };
  const toggleMute = async () => {
    const res = await fetch(`/api/users/${username}/mute`, { method: "POST" });
    if (res.ok) { mutate(); setMenuOpen(false); }
  };

  if (!user) return <div className="p-8 text-muted">読み込み中...</div>;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="h-32 bg-gradient-to-r from-purple-600 to-blue-600" style={{ backgroundImage: user.bannerUrl ? `url(${user.bannerUrl})` : undefined, backgroundSize: "cover" }} />
      <div className="px-4">
        <div className="flex items-end justify-between -mt-10">
          <div className="w-24 h-24 rounded-full accent-bg border-4 border-primary flex items-center justify-center text-white text-3xl font-bold">
            {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" /> : user.displayName?.[0]}
          </div>
          <div className="flex items-center gap-2">
            {isMe ? (
              <Link href="/settings" className="btn-ghost border border-app">プロフィール編集</Link>
            ) : (
              <>
                <button onClick={() => startOutgoingCall(user.id, user.displayName, false, meId, meName)} className="btn-ghost border border-app p-2" title="音声通話"><Phone size={16} /></button>
                <button onClick={() => startOutgoingCall(user.id, user.displayName, true, meId, meName)} className="btn-ghost border border-app p-2" title="ビデオ通話"><Video size={16} /></button>
                <Link href={`/dm/${user.id}`} className="btn-ghost border border-app p-2" title="DM"><MessageCircle size={16} /></Link>
                <button onClick={toggleFollow} className={isFollowing ? "btn-ghost border border-app" : "btn"}>
                  {isFollowing ? "フォロー中" : "フォロー"}
                </button>
                <div className="relative">
                  <button onClick={() => setMenuOpen(!menuOpen)} className="btn-ghost border border-app p-2"><MoreHorizontal size={16} /></button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-1 bg-secondary border border-app rounded-lg shadow-xl z-20 w-40 overflow-hidden">
                      <button onClick={toggleMute} className="w-full text-left px-3 py-2 text-sm hover:bg-tertiary">
                        {user.isMuted ? "ミュート解除" : "ミュートする"}
                      </button>
                      <button onClick={toggleBlock} className="w-full text-left px-3 py-2 text-sm hover:bg-tertiary text-red-400">
                        {user.isBlocked ? "ブロック解除" : "ブロックする"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xl font-bold">{user.displayName}</div>
          <div className="text-muted">@{user.username}</div>
          {user.isBlocked && <div className="text-xs text-red-400 mt-1">このユーザーをブロック中です</div>}
          {user.blockedByThem && <div className="text-xs text-red-400 mt-1">このユーザーからブロックされています</div>}
          {user.bio && <div className="mt-2 whitespace-pre-wrap">{user.bio}</div>}
          <div className="flex gap-4 mt-3 text-sm">
            <span><strong>{user._count.following}</strong> <span className="text-muted">フォロー中</span></span>
            <span><strong>{user._count.followers}</strong> <span className="text-muted">フォロワー</span></span>
            <span><strong>{user._count.posts}</strong> <span className="text-muted">投稿</span></span>
          </div>
        </div>
      </div>
      <div className="border-t border-app mt-4">
        {posts?.map((p: any) => <PostCard key={p.id} post={p} onDelete={() => mutatePosts()} />)}
      </div>
    </div>
  );
}
