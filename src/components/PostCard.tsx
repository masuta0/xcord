"use client";
import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Repeat2, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { timeAgo } from "@/lib/utils";
import { getSocket } from "@/lib/socket";
import MentionText from "./MentionText";
import ReactionBar, { aggregateReactions } from "./ReactionBar";

export default function PostCard({ post, onDelete, linkToThread = true }: { post: any; onDelete?: () => void; linkToThread?: boolean }) {
  const { data: session } = useSession();
  const [reposted, setReposted] = useState(post.reposted);
  const [rpCount, setRpCount] = useState(post._count?.reposts || 0);
  const [reactions, setReactions] = useState(aggregateReactions(post.reactions, session?.user?.id));
  const isMine = session?.user?.id === post.author.id;
  const images: string[] = post.images?.length ? post.images : (post.imageUrl ? [post.imageUrl] : []);

  const repost = async () => {
    const prev = reposted;
    setReposted(!prev);
    setRpCount((c: number) => c + (prev ? -1 : 1));
    const res = await fetch(`/api/posts/${post.id}/repost`, { method: "POST" });
    if (!res.ok) { setReposted(prev); setRpCount((c: number) => c + (prev ? 1 : -1)); return; }
    getSocket().emit("post:repost", { postId: post.id, reposted: !prev });
    if (!prev) getSocket().emit("notify", { to: post.author.id, notification: { type: "repost", postId: post.id } });
  };

  const react = async (emoji: string) => {
    const res = await fetch(`/api/posts/${post.id}/reaction`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }),
    });
    const data = await res.json();
    if (res.ok) {
      setReactions((prev) => {
        const idx = prev.findIndex((r) => r.emoji === emoji);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], count: updated[idx].count + (data.reacted ? 1 : -1), reacted: data.reacted };
          return updated;
        }
        return [...prev, { emoji, count: 1, reacted: true }];
      });
      getSocket().emit("post:reaction", { postId: post.id, emoji, reacted: data.reacted });
      if (data.reacted) getSocket().emit("notify", { to: post.author.id, notification: { type: "reaction", postId: post.id } });
    }
  };

  const del = async () => {
    if (!confirm("この投稿を削除しますか?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) { getSocket().emit("post:delete", { postId: post.id }); onDelete?.(); }
  };

  const likeReaction = reactions.find((r) => r.emoji === "❤️");
  const isLiked = !!likeReaction?.reacted;
  const likeCount = likeReaction?.count || 0;

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
          <div className="mt-1"><MentionText content={post.content} /></div>
          {images.length > 0 && (
            <div className={`grid gap-1 mt-2 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {images.map((img, i) => (
                <img key={i} src={img} className="rounded-lg max-h-80 w-full object-cover" alt="" />
              ))}
            </div>
          )}
          <div className="flex items-center gap-6 mt-3 text-muted text-sm">
            {linkToThread ? (
              <Link href={`/post/${post.id}`} className="flex items-center gap-1 hover:text-blue-400">
                <MessageCircle size={16} /> {post._count?.replies || 0}
              </Link>
            ) : (
              <span className="flex items-center gap-1"><MessageCircle size={16} /> {post._count?.replies || 0}</span>
            )}
            <button onClick={repost} className={`flex items-center gap-1 hover:text-green-400 ${reposted ? "text-green-400" : ""}`}>
              <Repeat2 size={16} /> {rpCount}
            </button>
            <button onClick={() => react("❤️")} className={`flex items-center gap-1 hover:text-red-400 ${isLiked ? "text-red-400" : ""}`}>
              {isLiked ? "❤️" : "🤍"} {likeCount}
            </button>
          </div>
          <ReactionBar reactions={reactions.filter((r) => r.emoji !== "❤️")} onToggle={react} />
        </div>
      </div>
    </article>
  );
}
