import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const body = await req.json();
  const emoji = String(body.emoji || "").slice(0, 8);
  const messageId = String(body.messageId || "");
  if (!emoji || !messageId) return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });

  const userId = session.user.id;
  const existing = await prisma.dMReaction.findUnique({ where: { userId_messageId_emoji: { userId, messageId, emoji } } });

  let reacted: boolean;
  if (existing) {
    await prisma.dMReaction.delete({ where: { id: existing.id } });
    reacted = false;
  } else {
    await prisma.dMReaction.create({ data: { userId, messageId, emoji } });
    reacted = true;
  }
  return NextResponse.json({ messageId, emoji, reacted, userId });
}
