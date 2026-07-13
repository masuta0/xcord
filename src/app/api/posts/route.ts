import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// タイムライン取得(最新順)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "all"; // all / following / user
  const userId = searchParams.get("userId");

  let where: any = { parentId: null };
  if (scope === "following" && session?.user?.id) {
    const follows = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    });
    const ids = follows.map((f) => f.followingId);
    ids.push(session.user.id);
    where.authorId = { in: ids };
  } else if (scope === "user" && userId) {
    where.authorId = userId;
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, reposts: true, comments: true } },
      likes:   session?.user?.id ? { where: { userId: session.user.id }, select: { id: true } } : false,
      reposts: session?.user?.id ? { where: { userId: session.user.id }, select: { id: true } } : false,
    },
  });

  const shaped = posts.map((p) => ({
    ...p,
    liked: (p as any).likes && (p as any).likes.length > 0,
    reposted: (p as any).reposts && (p as any).reposts.length > 0,
  }));

  return NextResponse.json(shaped);
}

// 新規投稿
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const content = String(body.content || "").slice(0, 500);
  if (!content.trim()) return NextResponse.json({ error: "内容が空です" }, { status: 400 });

  const post = await prisma.post.create({
    data: {
      content,
      imageUrl: body.imageUrl || null,
      authorId: session.user.id,
      parentId: body.parentId || null,
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, reposts: true, comments: true } },
    },
  });
  return NextResponse.json(post);
}
