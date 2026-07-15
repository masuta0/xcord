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

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: session.user.id, blockedId: target.id } },
  });
  if (existing) {
    await prisma.block.delete({ where: { id: existing.id } });
    return NextResponse.json({ blocked: false });
  }
  await prisma.block.create({ data: { blockerId: session.user.id, blockedId: target.id } });
  // ブロックすると相互フォローも解除
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: session.user.id, followingId: target.id },
        { followerId: target.id, followingId: session.user.id },
      ],
    },
  });
  return NextResponse.json({ blocked: true });
}
