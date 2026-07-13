import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { username: string } }) {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { username: params.username.toLowerCase() },
    select: {
      id: true, username: true, displayName: true, bio: true, avatarUrl: true, bannerUrl: true,
      createdAt: true,
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  let isFollowing = false;
  if (session?.user?.id && session.user.id !== user.id) {
    const f = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
    });
    isFollowing = !!f;
  }
  return NextResponse.json({ ...user, isFollowing });
}
