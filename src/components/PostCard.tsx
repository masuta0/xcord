"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Repeat2, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { timeAgo } from "@/lib/utils";
import { getSocket } from "@/lib/socket";

export default function PostCard({ post, onDelete }: { post: any; onDelete?: () => void }) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(post.liked);
  const [reposted, setReposted] = useState(post.reposted);
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
  const [rpCount, setRpCount] = useState(post._count?.reposts || 0);
  const isMine = session?.user?.id === post.author.id;

  const like = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikeCount((c: number) => c + (prev ? -1 : 1));
    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    if (!res.ok) { setLiked(prev); setLikeCount((c: number) => c + (prev ? 1 : -1)); return; }
    getSocket().emit("post:like", { postId: post.id, liked: !prev });
    if (!prev) getSocket().emit("notify", { to: post.author.id, notification: { type: "like", postId: post.id } });
  };
  const repost = async () => {
    const prev = reposted;
    setReposted(!prev);
    setRpCount((c: number) => c + (prev ? -1 : 1));
    const res = await fetch(`/api/posts/${post.id}/repost`, { method: "POST" });
    if (!res.ok) { setReposted(prev); setRpCount((c: number) => c + (prev ? 1 : -1)); return; }
    getSocket().emit("post:repost", { postId: post.id, reposted: !prev });
    if (!prev) getSocket().emit("notify", { to: post.author.id, notification: { type: "repost", postId: post.id } });
  };
  const del = async () => {
    if (!confirm("この投稿を削除しますか?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) onDelete?.();
  };

  return (
    <article className="border-b border-app px-4 py-3 hover:bg-secondary/50 transition-colors">
      <div className="flex gap-3">
        <Link href={`/profile/${post.author.username}`}>
          <div className="w-10 h-10 rounded-full accent-bg flex items-center justify-center text-white font-bold">
            {post.author.avatarUrl ? <img src={post.author.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" /> : post.author.displayName?.[0]}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/profile/${post.author.username}`} className="font-bold hover:underline">{post.author.displayName}</Link>
            <span className="text-muted">@{post.author.username}</span>
            <span className="text-muted">·</span>
            <span className="text-muted">{timeAgo(post.createdAt)}</span>
            {isMine && (
              <button onClick={del} className="ml-auto text-muted hover:text-red-400" title="削除">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="whitespace-pre-wrap break-words mt-1">{post.content}</div>
          {post.imageUrl && <img src={post.imageUrl} className="mt-2 rounded-lg max-h-96" alt="" />}
          <div className="flex items-center gap-6 mt-3 text-muted text-sm">
            <button className="flex items-center gap-1 hover:text-blue-400"><MessageCircle size={16} /> {post._count?.comments || 0}</button>
            <button onClick={repost} className={`flex items-center gap-1 hover:text-green-400 ${reposted ? "text-green-400" : ""}`}>
              <Repeat2 size={16} /> {rpCount}
            </button>
            <button onClick={like} className={`flex items-center gap-1 hover:text-red-400 ${liked ? "text-red-400" : ""}`}>
              <Heart size={16} fill={liked ? "currentColor" : "none"} /> {likeCount}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
