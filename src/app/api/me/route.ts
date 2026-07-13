import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, username: true, displayName: true, bio: true,
      avatarUrl: true, bannerUrl: true, theme: true, accentColor: true, isAdmin: true,
    },
  });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const body = await req.json();
  const data: any = {};
  if (typeof body.displayName === "string") data.displayName = body.displayName.slice(0, 30);
  if (typeof body.bio === "string") data.bio = body.bio.slice(0, 300);
  if (typeof body.avatarUrl === "string") data.avatarUrl = body.avatarUrl;
  if (typeof body.bannerUrl === "string") data.bannerUrl = body.bannerUrl;
  if (typeof body.theme === "string") data.theme = body.theme;
  if (typeof body.accentColor === "string") data.accentColor = body.accentColor;

  // パスワード変更(現行パスワード必須)
  if (body.newPassword) {
    const me = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!me) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    const ok = await bcrypt.compare(body.currentPassword || "", me.passwordHash);
    if (!ok) return NextResponse.json({ error: "現在のパスワードが違います" }, { status: 400 });
    if (String(body.newPassword).length < 6)
      return NextResponse.json({ error: "6文字以上必要です" }, { status: 400 });
    data.passwordHash = await bcrypt.hash(body.newPassword, 10);
  }

  const updated = await prisma.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ ok: true, user: updated });
}
