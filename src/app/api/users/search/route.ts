import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q.toLowerCase() } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
    take: 20,
  });
  return NextResponse.json(users);
}
