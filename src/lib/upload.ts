"use client";
// 画像は「軽く」リサイズ・圧縮した後、サーバー経由でImageKitにアップロードし、
// 返ってきたURL(文字列)だけをDBに保存する。
// 以前のように base64 をDBに直接保存する方式はやめた
// (画質を落とさないと入らない上に、DB容量をすぐ圧迫していたため)。

// 画面表示に使わない超高解像度の元画像(スマホの元写真など)だけを
// ある程度の大きさに抑える。見た目ではほぼ気づかないレベルの設定。
function resizeToBlob(file: File, maxSize = 2048, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
          else { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas unsupported"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("画像の変換に失敗しました"))),
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadBlob(blob: Blob, folder: string): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "image.jpg");
  form.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "アップロードに失敗しました");
  }
  const data = await res.json();
  return data.url as string;
}

// 呼び出し側(ImageUploadButton, 設定画面など)は変更なしで使えるよう、
// 関数名・引数の形は既存のまま維持している。戻り値は base64 ではなく
// ImageKit上の画像URLになった。
export async function compressImage(
  file: File,
  maxSize = 2048,
  quality = 0.92,
  folder: "posts" | "avatars" | "dm" | "channels" = "posts"
): Promise<string> {
  const blob = await resizeToBlob(file, maxSize, quality);
  return uploadBlob(blob, folder);
}

export async function compressImages(
  files: FileList | File[],
  maxSize = 2048,
  quality = 0.92,
  folder: "posts" | "avatars" | "dm" | "channels" = "posts"
): Promise<string[]> {
  const arr = Array.from(files).slice(0, 4); // 一度に最大4枚
  const results: string[] = [];
  for (const f of arr) {
    if (!f.type.startsWith("image/")) continue;
    try {
      results.push(await compressImage(f, maxSize, quality, folder));
    } catch {
      /* skip */
    }
  }
  return results;
}
