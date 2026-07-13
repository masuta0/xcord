import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, reposts: true, comments: true } },
      replies: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { likes: true, reposts: true } },
        },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  return NextResponse.json(post);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (post.authorId !== session.user.id && !session.user.isAdmin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
