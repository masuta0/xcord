"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

// DM用 1対1 WebRTC通話フック
// callId をルームキーとしてP2P接続を確立する(2人専用のシンプルなmesh)

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export interface RemotePeer {
  socketId: string;
  userId: string;
  stream?: MediaStream;
}

export function useWebRTCCall() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [connected, setConnected] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const callIdRef = useRef<string | null>(null);
  const myUserIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    setRemotePeers([]);
    setConnected(false);
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
  }, [localStream]);

  const createPeerConnection = useCallback((targetSocketId: string, callId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket().emit("call:signal", {
          callId, targetSocketId, userId: myUserIdRef.current,
          signal: { type: "candidate", candidate: e.candidate },
        });
      }
    };
    pc.ontrack = (e) => {
      setRemotePeers((prev) => {
        const idx = prev.findIndex((p) => p.socketId === targetSocketId);
        const stream = e.streams[0];
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], stream };
          return updated;
        }
        return [...prev, { socketId: targetSocketId, userId: "", stream }];
      });
      setConnected(true);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setRemotePeers((prev) => prev.filter((p) => p.socketId !== targetSocketId));
      }
    };
    pcsRef.current.set(targetSocketId, pc);
    return pc;
  }, []);

  // 通話開始(発信/着信どちらもこれを呼ぶ)
  const startCall = useCallback(async (callId: string, myUserId: string, video: boolean) => {
    callIdRef.current = callId;
    myUserIdRef.current = myUserId;
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
    setLocalStream(stream);
    setVideoEnabled(video);

    const s = getSocket();
    s.emit("call:join", { callId, userId: myUserId });

    const onPeerJoined = async ({ socketId }: { socketId: string }) => {
      const pc = createPeerConnection(socketId, callId, stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit("call:signal", { callId, targetSocketId: socketId, userId: myUserId, signal: { type: "offer", sdp: offer } });
    };

    const onSignal = async ({ fromSocketId, signal }: { fromSocketId: string; signal: any }) => {
      let pc = pcsRef.current.get(fromSocketId);
      if (!pc) pc = createPeerConnection(fromSocketId, callId, stream);
      if (signal.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit("call:signal", { callId, targetSocketId: fromSocketId, userId: myUserId, signal: { type: "answer", sdp: answer } });
      } else if (signal.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === "candidate") {
        try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch {}
      }
    };

    const onPeerLeft = ({ socketId }: { socketId: string }) => {
      pcsRef.current.get(socketId)?.close();
      pcsRef.current.delete(socketId);
      setRemotePeers((prev) => prev.filter((p) => p.socketId !== socketId));
    };

    s.on("call:peer-joined", onPeerJoined);
    s.on("call:signal", onSignal);
    s.on("call:peer-left", onPeerLeft);

    return () => {
      s.off("call:peer-joined", onPeerJoined);
      s.off("call:signal", onSignal);
      s.off("call:peer-left", onPeerLeft);
    };
  }, [createPeerConnection]);

  const endCall = useCallback(() => {
    if (callIdRef.current) getSocket().emit("call:leave", { callId: callIdRef.current });
    cleanup();
  }, [cleanup]);

  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVideoEnabled(track.enabled); }
  }, [localStream]);

  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setAudioEnabled(track.enabled); }
  }, [localStream]);

  useEffect(() => () => cleanup(), []); // eslint-disable-line

  return { localStream, remotePeers, connected, videoEnabled, audioEnabled, startCall, endCall, toggleVideo, toggleAudio };
}
