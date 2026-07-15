import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 特定ユーザーとのDM履歴取得
export async function GET(_: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const me = session.user.id;
  const other = params.userId;

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: me, receiverId: other },
        { senderId: other, receiverId: me },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      reactions: { select: { userId: true, emoji: true } },
    },
  });

  await prisma.directMessage.updateMany({
    where: { senderId: other, receiverId: me, read: false },
    data: { read: true },
  });

  return NextResponse.json(messages);
}

// DM送信
export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });

  // ブロック関係チェック(どちらかがブロックしていたら送信不可)
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: session.user.id, blockedId: params.userId },
        { blockerId: params.userId, blockedId: session.user.id },
      ],
    },
  });
  if (block) return NextResponse.json({ error: "ブロック関係のためDMを送信できません" }, { status: 403 });

  const body = await req.json();
  const content = String(body.content || "").slice(0, 2000);
  const images: string[] = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
  if (!content.trim() && images.length === 0) return NextResponse.json({ error: "内容が空です" }, { status: 400 });

  const dm = await prisma.directMessage.create({
    data: {
      senderId: session.user.id,
      receiverId: params.userId,
      content,
      imageUrl: images[0] || body.imageUrl || null,
      images,
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  // DMも永続化された通知として保存(ブレーズー不在時も後から確認可能にする)
  await prisma.notification.create({
    data: {
      type: "dm",
      recipientId: params.userId,
      actorId: session.user.id,
      entityId: dm.id,
      contextLabel: `${dm.sender.displayName} さんからのDM`,
      preview: content.slice(0, 80),
    },
  });

  return NextResponse.json({ ...dm, reactions: [] });
}
