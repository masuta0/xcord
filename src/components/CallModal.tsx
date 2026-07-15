"use client";
import { useEffect, useRef } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";

interface CallModalProps {
  callId: string;
  myUserId: string;
  partnerName: string;
  video: boolean;
  isIncoming?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onEnd: () => void;
  autoStart?: boolean;
}

// DM用 1対1 通話モーダル(発信中/着信中/通話中の全状態を扱う)
export default function CallModal({ callId, myUserId, partnerName, video, isIncoming, onAccept, onDecline, onEnd, autoStart }: CallModalProps) {
  const { localStream, remotePeers, connected, videoEnabled, audioEnabled, startCall, endCall, toggleVideo, toggleAudio } = useWebRTCCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      startCall(callId, myUserId, video);
    }
  }, [autoStart, callId, myUserId, video, startCall]);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteVideoRef.current && remotePeers[0]?.stream) remoteVideoRef.current.srcObject = remotePeers[0].stream;
  }, [remotePeers]);

  const handleEnd = () => { endCall(); onEnd(); };

  if (isIncoming && !autoStart) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
        <div className="card w-80 text-center space-y-4">
          <div className="w-20 h-20 rounded-full accent-bg flex items-center justify-center text-white text-3xl font-bold mx-auto animate-pulse">
            {partnerName?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-lg">{partnerName}</div>
            <div className="text-muted text-sm">{video ? "ビデオ通話" : "音声通話"}の着信...</div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={onDecline} className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
              <PhoneOff size={20} />
            </button>
            <button onClick={onAccept} className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600">
              <Phone size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[100]">
      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden mx-4">
        {remotePeers[0]?.stream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white">
            <div className="w-20 h-20 rounded-full accent-bg flex items-center justify-center text-2xl font-bold mb-3">
              {partnerName?.[0]?.toUpperCase()}
            </div>
            <div>{connected ? partnerName : `${partnerName} を呼び出し中...`}</div>
          </div>
        )}
        {videoEnabled && localStream && (
          <video ref={localVideoRef} autoPlay playsInline muted
            className="absolute bottom-3 right-3 w-32 h-24 rounded-lg object-cover border-2 border-white/20" />
        )}
      </div>
      <div className="flex gap-4 mt-6">
        <button onClick={toggleAudio} className={`w-12 h-12 rounded-full flex items-center justify-center ${audioEnabled ? "bg-secondary text-white" : "bg-red-500 text-white"}`}>
          {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center ${videoEnabled ? "bg-secondary text-white" : "bg-red-500 text-white"}`}>
          {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        <button onClick={handleEnd} className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
