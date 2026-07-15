"use client";
import { useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Heart, Repeat2, UserPlus, MessageCircle, Mail, AtSign, Smile, Hash } from "lucide-react";
import { timeAgo } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotificationsPage() {
  const { data, mutate } = useSWR("/api/notifications", fetcher);

  useEffect(() => {
    // 既読化
    fetch("/api/notifications", { method: "PATCH" });
    const handler = () => mutate();
    window.addEventListener("app:notification", handler);
    return () => window.removeEventListener("app:notification", handler);
  }, [mutate]);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="sticky top-0 bg-primary/90 backdrop-blur border-b border-app z-10 px-4 py-3 font-bold text-xl">
        通知
      </header>
      {data?.length === 0 && <div className="p-8 text-center text-muted">通知はありません</div>}
      {data?.map((n: any) => {
        const content = (
          <div className={`flex items-start gap-3 px-4 py-3 border-b border-app hover:bg-secondary/40 ${!n.read ? "bg-secondary/60" : ""}`}>
            <div className="mt-1">{icon(n.type)}</div>
            <div className="flex-1">
              <Link href={`/profile/${n.actor.username}`} className="font-bold hover:underline" onClick={(e) => e.stopPropagation()}>{n.actor.displayName}</Link>
              <span className="text-muted"> {label(n.type)}</span>
              {n.type === "channel_message" && n.contextLabel && (
                <div className="text-xs mt-0.5 accent">{n.contextLabel}</div>
              )}
              {(n.type === "channel_message" || n.type === "dm") && n.preview && (
                <div className="text-xs text-muted mt-0.5 truncate">{n.preview}</div>
              )}
              <div className="text-xs text-muted mt-0.5">{timeAgo(n.createdAt)}</div>
            </div>
          </div>
        );
        return (
          <Link key={n.id} href={linkFor(n)}>{content}</Link>
        );
      })}
    </div>
  );
}

// 通知タイプに応じて適切な遷移先を決定（どこで何が起きたかをクリリワンクで確認できるようにする）
function linkFor(n: any): string {
  switch (n.type) {
    case "dm":
      return `/dm/${n.actor.id}`;
    case "channel_message":
    case "mention_channel":
      return n.serverId && n.entityId ? `/servers/${n.serverId}/channels/${n.entityId}` : "/home";
    case "like":
    case "reaction":
    case "repost":
    case "comment":
    case "mention":
      return n.entityId ? `/post/${n.entityId}` : "/home";
    case "follow":
      return `/profile/${n.actor.username}`;
    default:
      return "/home";
  }
}

function icon(type: string) {
  const cls = "w-5 h-5";
  switch (type) {
    case "like":     return <Heart className={`${cls} text-red-400`} />;
    case "reaction":return <Smile className={`${cls} text-yellow-400`} />;
    case "repost":   return <Repeat2 className={`${cls} text-green-400`} />;
    case "follow":  return <UserPlus className={`${cls} text-blue-400`} />;
    case "comment": return <MessageCircle className={`${cls} text-yellow-400`} />;
    case "mention": return <AtSign className={`${cls} accent`} />;
    case "dm":       return <Mail className={`${cls} accent`} />;
    case "channel_message": return <Hash className={`${cls} accent`} />;
    default:         return null;
  }
}
function label(type: string) {
  switch (type) {
    case "like": return "があなたの投稿にいいねしました";
    case "reaction": return "があなたの投稿にリアクションしました";
    case "repost": return "があなたの投稿をリツイートしました";
    case "follow": return "があなたをフォローしました";
    case "comment": return "があなたの投稿にコメントしました";
    case "mention": return "があなたをメンションしました";
    case "dm": return "からDMが届きました";
    case "channel_message": return "がチャンネルにメッセージを送信しました";
    default: return "";
  }
}
