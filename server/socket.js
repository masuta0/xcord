// Socket.IO サーバー: リアルタイム通信を担当
// いいね/RT/フォロー/通知/DM/チャンネルチャットのブロードキャストを管理
const { Server } = require("socket.io");
const http = require("http");

const PORT = process.env.SOCKET_PORT || 3001;
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Socket.IO server is running");
});

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("[socket] connected:", socket.id);

  // 個人ルーム(通知/DM用): userId をキーに参加
  socket.on("join:user", (userId) => {
    if (userId) socket.join(`user:${userId}`);
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

  socket.on("dm:send", ({ to, from, message }) => {
    const room = [to, from].sort().join(":");
    io.to(`dm:${room}`).emit("dm:new", message);
    io.to(`user:${to}`).emit("notification:new", {
      type: "dm",
      from,
      message,
    });
  });

  socket.on("channel:send", ({ channelId, message }) => {
    io.to(`channel:${channelId}`).emit("channel:new", message);
  });

  socket.on("notify", ({ to, notification }) => {
    io.to(`user:${to}`).emit("notification:new", notification);
  });

  socket.on("disconnect", () => {
    console.log("[socket] disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] Server listening on port ${PORT}`);
});
