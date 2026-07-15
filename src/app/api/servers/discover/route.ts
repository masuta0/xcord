import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// まだ参加していない公開サーバーの一覧(Discordの「サーバーを探す」相当)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const myMemberships = await prisma.serverMember.findMany({
    where: { userId: session.user.id },
    select: { serverId: true },
  });
  const joinedIds = myMemberships.map((m) => m.serverId);

  const servers = await prisma.server.findMany({
    where: { id: { notIn: joinedIds.length ? joinedIds : undefined } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      owner: { select: { username: true, displayName: true } },
      _count: { select: { members: true, channels: true } },
    },
  });
  return NextResponse.json(servers);
}
