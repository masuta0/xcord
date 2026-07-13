import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DM会話リスト取得
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const uid = session.user.id;
  const messages = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: uid }, { receiverId: uid }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender:   { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const map = new Map<string, any>();
  for (const m of messages) {
    const partner = m.senderId === uid ? m.receiver : m.sender;
    if (!map.has(partner.id)) {
      map.set(partner.id, { partner, lastMessage: m, unreadCount: 0 });
    }
    if (m.receiverId === uid && !m.read) {
      map.get(partner.id).unreadCount++;
    }
  }
  return NextResponse.json(Array.from(map.values()));
}
