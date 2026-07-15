import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const [blocks, mutes] = await Promise.all([
    prisma.block.findMany({ where: { blockerId: session.user.id }, include: { blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } }),
    prisma.mute.findMany({ where: { muterId: session.user.id }, include: { muted: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } }),
  ]);
  return NextResponse.json({
    blocked: blocks.map((b) => b.blocked),
    muted: mutes.map((m) => m.muted),
  });
}
