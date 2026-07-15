import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 参加中のサーバー一覧
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const memberships = await prisma.serverMember.findMany({
    where: { userId: session.user.id },
    include: {
      server: {
        include: { channels: true, _count: { select: { members: true } } },
      },
    },
  });
  return NextResponse.json(memberships.map((m) => ({ ...m.server, role: m.role })));
}

// サーバー作成 (テキスト2 + ボイス1を自動生成)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const body = await req.json();
  const name = String(body.name || "").slice(0, 50).trim();
  if (!name) return NextResponse.json({ error: "名前は必須です" }, { status: 400 });

  const server = await prisma.server.create({
    data: {
      name,
      description: body.description || null,
      iconUrl: body.iconUrl || null,
      ownerId: session.user.id,
      members: { create: { userId: session.user.id, role: "owner" } },
      channels: {
        create: [
          { name: "general", type: "text" },
          { name: "random", type: "text" },
          { name: "ボイスチャット", type: "voice" },
        ],
      },
    },
    include: { channels: true },
  });
  return NextResponse.json(server);
}
