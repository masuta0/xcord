import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const existing = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: session.user.id, serverId: params.id } },
  });
  if (existing) return NextResponse.json({ ok: true, already: true });
  await prisma.serverMember.create({
    data: { userId: session.user.id, serverId: params.id, role: "member" },
  });
  return NextResponse.json({ ok: true });
}
