import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { username: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (target.id === session.user.id) return NextResponse.json({ error: "自分は不可" }, { status: 400 });

  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: session.user.id, blockedId: target.id },
        { blockerId: target.id, blockedId: session.user.id },
      ],
    },
  });
  if (block) return NextResponse.json({ error: "ブロック関係のためフォローできません" }, { status: 403 });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
  });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }
  await prisma.follow.create({
    data: { followerId: session.user.id, followingId: target.id },
  });
  await prisma.notification.create({
    data: { type: "follow", recipientId: target.id, actorId: session.user.id },
  });
  return NextResponse.json({ following: true });
}
