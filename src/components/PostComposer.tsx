"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { getSocket } from "@/lib/socket";
import ImageUploadButton from "./ImageUploadButton";

export default function PostComposer({ onPosted }: { onPosted: (p: any) => void }) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if ((!content.trim() && images.length === 0) || loading) return;
    setLoading(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, images }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setContent(""); setImages([]);
      onPosted({ ...data, liked: false, reposted: false });
      getSocket().emit("post:new", data);
    }
  };

  return (
    <div className="border-b border-app p-4">
      <textarea
        className="input min-h-[80px] resize-none"
        placeholder="いま何してる? @ユーザー名 でメンションできます"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit();
        }}
      />
      <div className="mt-2">
        <ImageUploadButton images={images} setImages={setImages} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted">{content.length}/500 · Ctrl+Enterで投稿</span>
        <button onClick={submit} disabled={loading || (!content.trim() && images.length === 0)} className="btn flex items-center gap-1">
          <Send size={14} /> 投稿
        </button>
      </div>
    </div>
  );
}
