"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import PostCard from "@/components/PostCard";
import ImageUploadButton from "@/components/ImageUploadButton";
import { getSocket } from "@/lib/socket";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// 投稿詳細 + スレッド(返信)表示ページ
export default function PostThreadPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const { data: session } = useSession();
  const { data: post, mutate } = useSWR(postId ? `/api/posts/${postId}` : null, fetcher);
  const [reply, setReply] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const submitReply = async () => {
    if ((!reply.trim() && images.length === 0) || loading) return;
    setLoading(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply, images, parentId: postId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setReply(""); setImages([]);
      mutate();
      getSocket().emit("post:new", data);
      if (post?.author?.id) {
        getSocket().emit("notify", { to: post.author.id, notification: { type: "comment", postId: data.id } });
      }
    }
  };

  if (!post) return <div className="p-8 text-muted">読み込み中...</div>;
  if (post.error) return <div className="p-8 text-muted">投稿が見つかりません</div>;

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="sticky top-0 bg-primary/90 backdrop-blur border-b border-app z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-primary">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-lg">投稿</span>
      </header>

      {post.parent && (
        <Link href={`/post/${post.parent.id}`} className="block px-4 py-2 text-xs text-muted hover:bg-secondary/40 border-b border-app">
          @{post.parent.author.username} への返信を表示
        </Link>
      )}

      <PostCard post={post} onDelete={() => router.push("/home")} linkToThread={false} />

      <div className="border-b border-app p-4">
        <textarea
          className="input min-h-[70px] resize-none"
          placeholder={`@${post.author.username} に返信`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={500}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submitReply(); }}
        />
        <div className="mt-2"><ImageUploadButton images={images} setImages={setImages} /></div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted">{reply.length}/500 · Ctrl+Enterで返信</span>
          <button onClick={submitReply} disabled={loading || (!reply.trim() && images.length === 0)} className="btn flex items-center gap-1">
            <Send size={14} /> 返信
          </button>
        </div>
      </div>

      <div>
        {post.replies?.length === 0 && <div className="p-8 text-center text-muted">まだ返信がありません</div>}
        {post.replies?.map((r: any) => <PostCard key={r.id} post={r} onDelete={() => mutate()} />)}
      </div>
    </div>
  );
}
