import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractMentions } from "@/lib/mentions";

// このチャンネルが属するサーバーのメンバーかどうかを確認
async function ensureMember(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
  if (!channel) return { ok: false as const };
  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId, serverId: channel.serverId } },
  });
  return { ok: !!member, serverId: channel.serverId };
}

// メッセージ履歴取得
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const access = await ensureMember(params.id, session.user.id);
  if (!access.ok) return NextResponse.json({ error: "このチャンネルへのアクセス権がありません" }, { status: 403 });

  const messages = await prisma.channelMessage.findMany({
    where: { channelId: params.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      reactions: { select: { userId: true, emoji: true } },
    },
  });
  return NextResponse.json(messages);
}

// メッセージ送信
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const access = await ensureMember(params.id, session.user.id);
  if (!access.ok) return NextResponse.json({ error: "このチャンネルへのアクセス権がありません" }, { status: 403 });

  const body = await req.json();
  const content = String(body.content || "").slice(0, 2000);
  const images: string[] = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
  if (!content.trim() && images.length === 0) return NextResponse.json({ error: "内容が空" }, { status: 400 });
  const msg = await prisma.channelMessage.create({
    data: {
      content,
      imageUrl: images[0] || body.imageUrl || null,
      images,
      channelId: params.id,
      userId: session.user.id,
    },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      channel: { select: { name: true, server: { select: { id: true, name: true } } } },
    },
  });

  // Xモードでも「どこで・誰から」がわかるよう、チャンネルの他メンバー全員に
  // channel_message 通知を永続化する(送信者自身は除く)。
  // 加えて @メンションされたユーザーには type=mention の通知も作成。
  const members = await prisma.serverMember.findMany({
    where: { serverId: access.serverId, userId: { not: session.user.id } },
    select: { userId: true },
  });
  const contextLabel = `${msg.channel.server.name} ・ #${msg.channel.name}`;
  const preview = content.slice(0, 80);
  if (members.length > 0) {
    await prisma.notification.createMany({
      data: members.map((m) => ({
        type: "channel_message",
        recipientId: m.userId,
        actorId: session.user.id,
        entityId: params.id,
        serverId: access.serverId,
        contextLabel,
        preview,
      })),
    });
  }
  const mentioned = extractMentions(content);
  if (mentioned.length > 0) {
    const users = await prisma.user.findMany({ where: { username: { in: mentioned } }, select: { id: true } });
    const targets = users.filter((u) => u.id !== session.user.id);
    if (targets.length > 0) {
      await prisma.notification.createMany({
        data: targets.map((u) => ({
          type: "mention",
          recipientId: u.id,
          actorId: session.user.id,
          entityId: params.id,
          serverId: access.serverId,
          contextLabel,
          preview,
        })),
      });
    }
  }

  const { channel, ...msgOut } = msg;
  const result = { ...msgOut, reactions: [] as any[] };

  // ソケット側にも「どこで・誰から」を伝えて即時のブラウザ通知に使えるようにする
  return NextResponse.json({
    ...result,
    _notif: {
      serverId: access.serverId,
      channelId: params.id,
      contextLabel,
      preview,
      recipients: members.map((m) => m.userId),
    },
  });
}
