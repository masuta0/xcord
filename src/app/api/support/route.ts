import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// パスワード復旧問い合わせ送信(未ログインでもOK)
export async function POST(req: Request) {
  const body = await req.json();
  const username = String(body.username || "").toLowerCase().trim();
  const contactInfo = String(body.contactInfo || "").slice(0, 200);
  const reason = String(body.reason || "").slice(0, 1000);
  if (!username || !reason) return NextResponse.json({ error: "必須項目が不足" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { username } });
  const ticket = await prisma.supportTicket.create({
    data: { username, contactInfo, reason, userId: user?.id || null, status: "open" },
  });
  return NextResponse.json({ ok: true, ticketId: ticket.id });
}

// 管理者用: チケット一覧
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return NextResponse.json({ error: "権限なし" }, { status: 403 });
  const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(tickets);
}
