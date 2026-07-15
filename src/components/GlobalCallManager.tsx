"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";
import CallModal from "./CallModal";

// アプリ全体で発着信を検知して CallModal を表示するグローバルマネージャ
// layout に1つだけ配置する
export default function GlobalCallManager() {
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id;
  const [incoming, setIncoming] = useState<{ from: string; fromName: string; callId: string; video: boolean } | null>(null);
  const [activeCall, setActiveCall] = useState<{ callId: string; partnerName: string; video: boolean; autoStart: boolean } | null>(null);

  useEffect(() => {
    if (!meId) return;
    const s = getSocket();
    const onIncoming = (data: any) => setIncoming(data);
    const onCancelled = () => setIncoming(null);
    s.on("call:incoming", onIncoming);
    s.on("call:cancelled", onCancelled);
    return () => { s.off("call:incoming", onIncoming); s.off("call:cancelled", onCancelled); };
  }, [meId]);

  // 発信側から呼ばれるグローバルイベント(DMページから起動)
  useEffect(() => {
    const handler = (e: any) => setActiveCall({ ...e.detail, autoStart: true });
    window.addEventListener("app:start-call", handler);
    return () => window.removeEventListener("app:start-call", handler);
  }, []);

  const acceptCall = () => {
    if (!incoming) return;
    setActiveCall({ callId: incoming.callId, partnerName: incoming.fromName, video: incoming.video, autoStart: true });
    setIncoming(null);
  };
  const declineCall = () => {
    if (!incoming) return;
    getSocket().emit("call:decline", { to: incoming.from, callId: incoming.callId });
    setIncoming(null);
  };

  return (
    <>
      {incoming && !activeCall && (
        <CallModal
          callId={incoming.callId}
          myUserId={meId}
          partnerName={incoming.fromName}
          video={incoming.video}
          isIncoming
          onAccept={acceptCall}
          onDecline={declineCall}
          onEnd={() => setIncoming(null)}
        />
      )}
      {activeCall && (
        <CallModal
          callId={activeCall.callId}
          myUserId={meId}
          partnerName={activeCall.partnerName}
          video={activeCall.video}
          autoStart={activeCall.autoStart}
          onEnd={() => setActiveCall(null)}
        />
      )}
    </>
  );
}

// DMページなどから通話開始をリクエストするヘルパー
export function startOutgoingCall(toUserId: string, toName: string, video: boolean, myUserId: string, myName: string) {
  const callId = [myUserId, toUserId].sort().join("-") + "-" + Date.now();
  getSocket().emit("call:invite", { to: toUserId, from: myUserId, fromName: myName, callId, video });
  window.dispatchEvent(new CustomEvent("app:start-call", { detail: { callId, partnerName: toName, video } }));
  return callId;
}
