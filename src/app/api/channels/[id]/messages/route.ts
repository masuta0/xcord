import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// メッセージ履歴取得
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const messages = await prisma.channelMessage.findMany({
    where: { channelId: params.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  return NextResponse.json(messages);
}

// メッセージ送信
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const body = await req.json();
  const content = String(body.content || "").slice(0, 2000);
  if (!content.trim()) return NextResponse.json({ error: "内容が空" }, { status: 400 });
  const msg = await prisma.channelMessage.create({
    data: {
      content,
      imageUrl: body.imageUrl || null,
      channelId: params.id,
      userId: session.user.id,
    },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  return NextResponse.json(msg);
}
