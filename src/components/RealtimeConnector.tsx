"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

// アプリ全体で1度だけソケット接続を確立、通知を受け取る
// uiMode を渡すと、Xモードで見ている最中にDiscordモード(チャンネル)の
// メッセージを受信した場合でも「どこで・誰から」を明示した画面通知を出す。
export default function RealtimeConnector({ userId, uiMode = "hybrid" }: { userId: string; uiMode?: string }) {
  useEffect(() => {
    const s = getSocket();
    s.emit("join:user", userId);
    s.emit("join:timeline");
    const handler = (n: any) => {
      const text = notifText(n);
      // ブラウザ通知(許可時)。channel_message は特にタイトルにも場所を出す。
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const title = n?.type === "channel_message" ? `Discord通知 — ${n.contextLabel || ""}` : "SocialHub";
        new Notification(title, { body: text, tag: n?.type === "channel_message" ? `ch-${n.entityId}` : undefined });
      }
      // カスタムイベントで各ページに伝播(Xモードのトースト表示などに利用)
      window.dispatchEvent(new CustomEvent("app:notification", { detail: n }));
      // Xモードで見ている間にDiscordのチャンネルメッセージが来た場合は、
      // 画面内トーストも出して見落としを防ぐ
      if (uiMode === "x" && n?.type === "channel_message") {
        window.dispatchEvent(new CustomEvent("app:toast", { detail: { text, kind: "discord" } }));
      }
    };
    s.on("notification:new", handler);
    // 通知許可のリクエスト
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    return () => { s.off("notification:new", handler); };
  }, [userId, uiMode]);
  return null;
}

function notifText(n: any) {
  switch (n?.type) {
    case "like":     return "投稿にいいねがつきました";
    case "reaction": return "投稿にリアクションがつきました";
    case "repost":   return "投稿がリツイートされました";
    case "follow":   return "新しいフォロワーがいます";
    case "mention":  return "メンションされました";
    case "dm":       return `DM: ${n.message?.content?.slice(0, 50) || ""}`;
    case "channel_message": {
      // Xモードで見ていても「どこで・誰から」が分かるように場所とメッセージを明示
      const who = n.actor?.displayName || n.actor?.username || "だれか";
      const where = n.contextLabel || "Discordチャンネル";
      const body = n.preview ? `: ${n.preview}` : "";
      return `【${where}】${who}さんから新着メッセージ${body}`;
    }
    default:         return "新しい通知";
  }
}
