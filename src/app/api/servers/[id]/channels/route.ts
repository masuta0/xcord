import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const server = await prisma.server.findUnique({ where: { id: params.id } });
  if (!server) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (server.ownerId !== session.user.id)
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name || "").slice(0, 40).trim();
  const type = body.type === "voice" ? "voice" : "text";
  if (!name) return NextResponse.json({ error: "名前が必要" }, { status: 400 });
  const channel = await prisma.channel.create({
    data: { name, serverId: params.id, type },
  });
  return NextResponse.json(channel);
}
