import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const userId = session.user.id;
  const postId = params.id;
  const existing = await prisma.repost.findUnique({ where: { userId_postId: { userId, postId } } });
  if (existing) {
    await prisma.repost.delete({ where: { id: existing.id } });
    return NextResponse.json({ reposted: false });
  }
  await prisma.repost.create({ data: { userId, postId } });

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (post && post.authorId !== userId) {
    await prisma.notification.create({
      data: { type: "repost", recipientId: post.authorId, actorId: userId, entityId: postId },
    });
  }
  return NextResponse.json({ reposted: true });
}
