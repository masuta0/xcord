import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const notifs = await prisma.notification.findMany({
    where: { recipientId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  return NextResponse.json(notifs);
}

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  await prisma.notification.updateMany({
    where: { recipientId: session.user.id, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
