import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "英数字とアンダースコアのみ"),
  password: z.string().min(6).max(100),
  displayName: z.string().min(1).max(30).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { username, password, displayName } = parsed.data;
    const uname = username.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { username: uname } });
    if (exists) return NextResponse.json({ error: "このユーザー名は既に使用されています" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username: uname,
        displayName: displayName || username,
        passwordHash,
      },
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
