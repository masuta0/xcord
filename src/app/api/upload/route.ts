import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { imagekit } from "@/lib/imagekit-server";

// 投稿/アイコン/DM/チャンネル画像を ImageKit にアップロードし、URLだけを返す
// (DBには画像本体ではなくこのURLを保存する)

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_FOLDERS = new Set(["posts", "avatars", "dm", "channels"]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const file = formData.get("file");
  const folderRaw = String(formData.get("folder") || "posts");
  const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "posts";

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ファイルが大きすぎます(8MBまで)" }, { status: 400 });
  }
  if (file.type && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "画像ファイルのみアップロードできます" }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await imagekit.upload({
      file: buffer,
      fileName: `${session.user.id}-${Date.now()}.jpg`,
      folder: `/${folder}`,
      useUniqueFileName: true,
    });

    return NextResponse.json({ url: result.url });
  } catch (err) {
    console.error("ImageKit upload error:", err);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
