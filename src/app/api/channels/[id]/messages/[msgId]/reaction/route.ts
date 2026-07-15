import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string; msgId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const body = await req.json();
  const emoji = String(body.emoji || "").slice(0, 8);
  if (!emoji) return NextResponse.json({ error: "emoji必須" }, { status: 400 });

  const userId = session.user.id;
  const messageId = params.msgId;
  const existing = await prisma.channelReaction.findUnique({ where: { userId_messageId_emoji: { userId, messageId, emoji } } });

  let reacted: boolean;
  if (existing) {
    await prisma.channelReaction.delete({ where: { id: existing.id } });
    reacted = false;
  } else {
    await prisma.channelReaction.create({ data: { userId, messageId, emoji } });
    reacted = true;
  }
  return NextResponse.json({ messageId, emoji, reacted, userId });
}
