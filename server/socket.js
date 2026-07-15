// Socket.IO サーバー: リアルタイム通信を担当
// いいね/RT/フォロー/通知/DM/チャンネルチャット/リアクション/WebRTC通話シグナリングを管理
const { Server } = require("socket.io");
const http = require("http");

const PORT = process.env.SOCKET_PORT || 3001;
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Socket.IO server is running");
});

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 5e6, // 5MB (画像付きメッセージのブロードキャスト用)
});

// ボイスチャンネル参加者管理: channelId -> Map<socketId, {userId, name, video}>
const voiceRooms = new Map();
// DM通話参加者管理: roomId -> Map<socketId, userId>
const callRooms = new Map();

function broadcastVoiceState(channelId) {
  const room = voiceRooms.get(channelId);
  const participants = room ? Array.from(room.values()) : [];
  io.to(`voice:${channelId}`).emit("voice:state", { channelId, participants });
}

io.on("connection", (socket) => {
  console.log("[socket] connected:", socket.id);

  // 個人ルーム(通知/DM用): userId をキーに参加
  socket.on("join:user", (userId) => {
    if (userId) { socket.join(`user:${userId}`); socket.data.userId = userId; }
  });

  // DM ルーム: 2ユーザーの id をソートして固定化
  socket.on("join:dm", ({ a, b }) => {
    if (a && b) {
      const room = [a, b].sort().join(":");
      socket.join(`dm:${room}`);
    }
  });

  // サーバーチャンネルルーム
  socket.on("join:channel", (channelId) => {
    if (channelId) socket.join(`channel:${channelId}`);
  });
  socket.on("leave:channel", (channelId) => {
    if (channelId) socket.leave(`channel:${channelId}`);
  });

  // 投稿タイムライン(グローバル)
  socket.on("join:timeline", () => socket.join("timeline"));

  // クライアントからのイベント中継
  socket.on("post:new", (data) => io.to("timeline").emit("post:new", data));
  socket.on("post:like", (data) => io.to("timeline").emit("post:like", data));
  socket.on("post:repost", (data) => io.to("timeline").emit("post:repost", data));
  socket.on("post:reaction", (data) => io.to("timeline").emit("post:reaction", data));
  socket.on("post:delete", (data) => io.to("timeline").emit("post:delete", data));

  socket.on("dm:send", ({ to, from, message }) => {
    const room = [to, from].sort().join(":");
    io.to(`dm:${room}`).emit("dm:new", message);
    io.to(`user:${to}`).emit("notification:new", {
      type: "dm",
      from,
      message,
    });
  });
  socket.on("dm:reaction", ({ to, from, data }) => {
    const room = [to, from].sort().join(":");
    io.to(`dm:${room}`).emit("dm:reaction", data);
  });
  socket.on("dm:typing", ({ to, from }) => {
    io.to(`user:${to}`).emit("dm:typing", { from });
  });

  socket.on("channel:send", ({ channelId, message }) => {
    io.to(`channel:${channelId}`).emit("channel:new", message);
  });
  socket.on("channel:reaction", ({ channelId, data }) => {
    io.to(`channel:${channelId}`).emit("channel:reaction", data);
  });

  socket.on("notify", ({ to, notification }) => {
    io.to(`user:${to}`).emit("notification:new", notification);
  });

  // ===== WebRTC: 1対1 DM ビデオ通話 =====
  // 発信: 相手のuser roomに着信を通知
  socket.on("call:invite", ({ to, from, fromName, callId, video }) => {
    io.to(`user:${to}`).emit("call:incoming", { from, fromName, callId, video });
  });
  socket.on("call:cancel", ({ to, callId }) => {
    io.to(`user:${to}`).emit("call:cancelled", { callId });
  });
  socket.on("call:decline", ({ to, callId }) => {
    io.to(`user:${to}`).emit("call:declined", { callId });
  });
  socket.on("call:join", ({ callId, userId }) => {
    socket.join(`call:${callId}`);
    if (!callRooms.has(callId)) callRooms.set(callId, new Map());
    callRooms.get(callId).set(socket.id, userId);
    // 既存参加者に新規参加を通知(offerを送ってもらうため)
    socket.to(`call:${callId}`).emit("call:peer-joined", { socketId: socket.id, userId });
  });
  socket.on("call:signal", ({ callId, targetSocketId, signal, userId }) => {
    io.to(targetSocketId).emit("call:signal", { fromSocketId: socket.id, signal, userId });
  });
  socket.on("call:leave", ({ callId }) => {
    socket.leave(`call:${callId}`);
    const room = callRooms.get(callId);
    if (room) { room.delete(socket.id); if (room.size === 0) callRooms.delete(callId); }
    socket.to(`call:${callId}`).emit("call:peer-left", { socketId: socket.id });
  });

  // ===== WebRTC: Discordサーバー ボイスチャンネル(グループ通話) =====
  socket.on("voice:join", ({ channelId, userId, name, video }) => {
    socket.join(`voice:${channelId}`);
    socket.data.voiceChannelId = channelId;
    if (!voiceRooms.has(channelId)) voiceRooms.set(channelId, new Map());
    voiceRooms.get(channelId).set(socket.id, { socketId: socket.id, userId, name, video: !!video });
    socket.to(`voice:${channelId}`).emit("voice:peer-joined", { socketId: socket.id, userId, name, video: !!video });
    broadcastVoiceState(channelId);
  });
  socket.on("voice:signal", ({ channelId, targetSocketId, signal, userId }) => {
    io.to(targetSocketId).emit("voice:signal", { fromSocketId: socket.id, signal, userId });
  });
  socket.on("voice:toggle-video", ({ channelId, video }) => {
    const room = voiceRooms.get(channelId);
    if (room?.has(socket.id)) { room.get(socket.id).video = !!video; broadcastVoiceState(channelId); }
  });
  socket.on("voice:leave", ({ channelId }) => {
    socket.leave(`voice:${channelId}`);
    const room = voiceRooms.get(channelId);
    if (room) { room.delete(socket.id); if (room.size === 0) voiceRooms.delete(channelId); }
    socket.to(`voice:${channelId}`).emit("voice:peer-left", { socketId: socket.id });
    broadcastVoiceState(channelId);
  });

  socket.on("disconnect", () => {
    // ボイスチャンネル離脱処理
    const vc = socket.data.voiceChannelId;
    if (vc) {
      const room = voiceRooms.get(vc);
      if (room) { room.delete(socket.id); if (room.size === 0) voiceRooms.delete(vc); }
      socket.to(`voice:${vc}`).emit("voice:peer-left", { socketId: socket.id });
      broadcastVoiceState(vc);
    }
    // DM通話離脱処理
    for (const [callId, room] of callRooms.entries()) {
      if (room.has(socket.id)) {
        room.delete(socket.id);
        socket.to(`call:${callId}`).emit("call:peer-left", { socketId: socket.id });
        if (room.size === 0) callRooms.delete(callId);
      }
    }
    console.log("[socket] disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] Server listening on port ${PORT}`);
});
