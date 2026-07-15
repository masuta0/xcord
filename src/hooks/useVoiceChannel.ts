"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

// Discordサーバーの ボイスチャンネル用 mesh WebRTC フック(複数人対応)
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export interface VoicePeer {
  socketId: string;
  userId: string;
  name: string;
  video: boolean;
  stream?: MediaStream;
}

export function useVoiceChannel() {
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<VoicePeer[]>([]);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    setPeers([]);
    setJoined(false);
  }, []);

  const createPC = useCallback((targetSocketId: string, channelId: string, stream: MediaStream, userId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket().emit("voice:signal", { channelId, targetSocketId, userId, signal: { type: "candidate", candidate: e.candidate } });
      }
    };
    pc.ontrack = (e) => {
      setPeers((prev) => prev.map((p) => p.socketId === targetSocketId ? { ...p, stream: e.streams[0] } : p));
    };
    pcsRef.current.set(targetSocketId, pc);
    return pc;
  }, []);

  const join = useCallback(async (channelId: string, userId: string, name: string, video: boolean) => {
    channelIdRef.current = channelId;
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
    setLocalStream(stream);
    setVideoEnabled(video);
    setJoined(true);

    const s = getSocket();
    s.emit("voice:join", { channelId, userId, name, video });

    s.on("voice:state", ({ channelId: cid, participants }: any) => {
      if (cid !== channelId) return;
      setPeers((prev) => {
        const selfSocketId = s.id;
        return participants
          .filter((p: any) => p.socketId !== selfSocketId)
          .map((p: any) => {
            const existing = prev.find((e) => e.socketId === p.socketId);
            return { ...p, stream: existing?.stream };
          });
      });
    });

    s.on("voice:peer-joined", async ({ socketId, userId: peerUserId }: any) => {
      const pc = createPC(socketId, channelId, stream, userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit("voice:signal", { channelId, targetSocketId: socketId, userId, signal: { type: "offer", sdp: offer } });
    });

    s.on("voice:signal", async ({ fromSocketId, signal }: any) => {
      let pc = pcsRef.current.get(fromSocketId);
      if (!pc) pc = createPC(fromSocketId, channelId, stream, userId);
      if (signal.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit("voice:signal", { channelId, targetSocketId: fromSocketId, userId, signal: { type: "answer", sdp: answer } });
      } else if (signal.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === "candidate") {
        try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch {}
      }
    });

    s.on("voice:peer-left", ({ socketId }: any) => {
      pcsRef.current.get(socketId)?.close();
      pcsRef.current.delete(socketId);
      setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
    });
  }, [createPC]);

  const leave = useCallback(() => {
    const s = getSocket();
    if (channelIdRef.current) s.emit("voice:leave", { channelId: channelIdRef.current });
    s.off("voice:state"); s.off("voice:peer-joined"); s.off("voice:signal"); s.off("voice:peer-left");
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    cleanup();
  }, [localStream, cleanup]);

  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    let track = localStream.getVideoTracks()[0];
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    if (channelIdRef.current) getSocket().emit("voice:toggle-video", { channelId: channelIdRef.current, video: newState });
    if (track) track.enabled = newState;
  }, [localStream, videoEnabled]);

  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setAudioEnabled(track.enabled); }
  }, [localStream]);

  useEffect(() => () => { localStream?.getTracks().forEach((t) => t.stop()); }, []); // eslint-disable-line

  return { joined, localStream, peers, videoEnabled, audioEnabled, join, leave, toggleVideo, toggleAudio };
}
