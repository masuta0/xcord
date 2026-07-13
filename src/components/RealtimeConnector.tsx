"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

// アプリ全体で1度だけソケット接続を確立、通知を受け取る
export default function RealtimeConnector({ userId }: { userId: string }) {
  useEffect(() => {
    const s = getSocket();
    s.emit("join:user", userId);
    s.emit("join:timeline");
    const handler = (n: any) => {
      // ブラウザ通知(許可時)
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("SocialHub", { body: notifText(n) });
      }
      // カスタムイベントで各ページに伝播
      window.dispatchEvent(new CustomEvent("app:notification", { detail: n }));
    };
    s.on("notification:new", handler);
    // 通知許可のリクエスト
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    return () => { s.off("notification:new", handler); };
  }, [userId]);
  return null;
}

function notifText(n: any) {
  switch (n?.type) {
    case "like":   return "投稿にいいねがつきました";
    case "repost": return "投稿がリツイートされました";
    case "follow": return "新しいフォロワーがいます";
    case "dm":     return `DM: ${n.message?.content?.slice(0, 50) || ""}`;
    default:       return "新しい通知";
  }
}
