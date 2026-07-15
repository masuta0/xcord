import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const server = await prisma.server.findUnique({
    where: { id: params.id },
    include: {
      channels: { orderBy: { createdAt: "asc" } },
      members: {
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      },
    },
  });
  if (!server) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  const isMember = server.members.some((m) => m.userId === session.user.id);
  if (!isMember) return NextResponse.json({ error: "このサーバーのメンバーではありません" }, { status: 403 });

  return NextResponse.json(server);
}

// サーバー削除(オーナーのみ)
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const server = await prisma.server.findUnique({ where: { id: params.id } });
  if (!server) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (server.ownerId !== session.user.id) return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  await prisma.server.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
