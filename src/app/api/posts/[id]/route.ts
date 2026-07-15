import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const authorSelect = { id: true, username: true, displayName: true, avatarUrl: true } as const;

// 投稿詳細 + スレッド(返信一覧)取得
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const meId = session?.user?.id;

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      author: { select: authorSelect },
      parent: { select: { id: true, author: { select: authorSelect } } },
      _count: { select: { likes: true, reposts: true, replies: true } },
      reactions: { select: { userId: true, emoji: true } },
      likes: meId ? { where: { userId: meId }, select: { id: true } } : false,
      reposts: meId ? { where: { userId: meId }, select: { id: true } } : false,
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: authorSelect },
          _count: { select: { likes: true, reposts: true, replies: true } },
          reactions: { select: { userId: true, emoji: true } },
          likes: meId ? { where: { userId: meId }, select: { id: true } } : false,
          reposts: meId ? { where: { userId: meId }, select: { id: true } } : false,
        },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  const shape = (p: any) => ({
    ...p,
    liked: (p.likes && p.likes.length > 0) || false,
    reposted: (p.reposts && p.reposts.length > 0) || false,
  });

  return NextResponse.json({ ...shape(post), replies: post.replies.map(shape) });
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
