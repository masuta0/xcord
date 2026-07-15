import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const body = await req.json();
  const emoji = String(body.emoji || "").slice(0, 8);
  if (!emoji) return NextResponse.json({ error: "emoji必須" }, { status: 400 });

  const userId = session.user.id;
  const postId = params.id;
  const existing = await prisma.postReaction.findUnique({ where: { userId_postId_emoji: { userId, postId, emoji } } });

  let reacted: boolean;
  if (existing) {
    await prisma.postReaction.delete({ where: { id: existing.id } });
    reacted = false;
  } else {
    await prisma.postReaction.create({ data: { userId, postId, emoji } });
    reacted = true;
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (post && post.authorId !== userId) {
      await prisma.notification.create({
        data: { type: "reaction", recipientId: post.authorId, actorId: userId, entityId: postId },
      });
    }
  }
  return NextResponse.json({ emoji, reacted, userId });
}
