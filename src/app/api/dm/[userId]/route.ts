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
  const body = await req.json();
  const content = String(body.content || "").slice(0, 2000);
  if (!content.trim()) return NextResponse.json({ error: "内容が空です" }, { status: 400 });

  const dm = await prisma.directMessage.create({
    data: {
      senderId: session.user.id,
      receiverId: params.userId,
      content,
      imageUrl: body.imageUrl || null,
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  return NextResponse.json(dm);
}
