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

  const existing = await prisma.mute.findUnique({
    where: { muterId_mutedId: { muterId: session.user.id, mutedId: target.id } },
  });
  if (existing) {
    await prisma.mute.delete({ where: { id: existing.id } });
    return NextResponse.json({ muted: false });
  }
  await prisma.mute.create({ data: { muterId: session.user.id, mutedId: target.id } });
  return NextResponse.json({ muted: true });
}
