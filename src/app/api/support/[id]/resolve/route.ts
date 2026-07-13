import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 管理者: パスワードリセット実行
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return NextResponse.json({ error: "権限なし" }, { status: 403 });
  const body = await req.json();
  const newPassword = String(body.newPassword || "");
  if (newPassword.length < 6) return NextResponse.json({ error: "6文字以上" }, { status: 400 });

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  const user = ticket.userId
    ? await prisma.user.findUnique({ where: { id: ticket.userId } })
    : await prisma.user.findUnique({ where: { username: ticket.username } });
  if (!user) return NextResponse.json({ error: "ユーザーが存在しません" }, { status: 404 });

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  await prisma.supportTicket.update({
    where: { id: params.id },
    data: { status: "resolved", newPassword, resolvedAt: new Date() },
  });
  return NextResponse.json({ ok: true, newPassword });
}
