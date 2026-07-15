import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractMentions } from "@/lib/mentions";

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

  // ミュート・ブロック中のユーザーの投稿を除外
  if (session?.user?.id) {
    const [mutes, blocks, blockedBy] = await Promise.all([
      prisma.mute.findMany({ where: { muterId: session.user.id }, select: { mutedId: true } }),
      prisma.block.findMany({ where: { blockerId: session.user.id }, select: { blockedId: true } }),
      prisma.block.findMany({ where: { blockedId: session.user.id }, select: { blockerId: true } }),
    ]);
    const excludeIds = [
      ...mutes.map((m) => m.mutedId),
      ...blocks.map((b) => b.blockedId),
      ...blockedBy.map((b) => b.blockerId),
    ];
    if (excludeIds.length > 0) {
      where.authorId = where.authorId
        ? { in: (where.authorId.in || []).filter((id: string) => !excludeIds.includes(id)) }
        : { notIn: excludeIds };
    }
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, reposts: true, replies: true } },
      likes:   session?.user?.id ? { where: { userId: session.user.id }, select: { id: true } } : false,
      reposts: session?.user?.id ? { where: { userId: session.user.id }, select: { id: true } } : false,
      reactions: { select: { userId: true, emoji: true } },
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
  if (!content.trim() && !(body.images?.length)) return NextResponse.json({ error: "内容が空です" }, { status: 400 });

  const images: string[] = Array.isArray(body.images) ? body.images.slice(0, 4) : [];

  const post = await prisma.post.create({
    data: {
      content,
      imageUrl: images[0] || body.imageUrl || null,
      images,
      authorId: session.user.id,
      parentId: body.parentId || null,
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, reposts: true, replies: true } },
    },
  });

  // 返信の場合: 元投稿の作者に通知
  if (body.parentId) {
    const parent = await prisma.post.findUnique({ where: { id: body.parentId }, select: { authorId: true } });
    if (parent && parent.authorId !== session.user.id) {
      await prisma.notification.create({
        data: { type: "comment", recipientId: parent.authorId, actorId: session.user.id, entityId: post.id },
      });
    }
  }

  // @メンション通知
  const mentionedUsernames = extractMentions(content);
  if (mentionedUsernames.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: { username: { in: mentionedUsernames }, id: { not: session.user.id } },
      select: { id: true },
    });
    if (mentionedUsers.length > 0) {
      await prisma.notification.createMany({
        data: mentionedUsers.map((u) => ({
          type: "mention",
          recipientId: u.id,
          actorId: session.user.id,
          entityId: post.id,
        })),
      });
    }
  }

  return NextResponse.json({ ...post, reactions: [], liked: false, reposted: false });
}
