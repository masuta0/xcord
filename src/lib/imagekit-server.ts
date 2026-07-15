// サーバー専用のImageKitクライアント。
// このファイルは絶対にクライアントコンポーネント("use client")からimportしないこと。
// IMAGEKIT_PRIVATE_KEY はブラウザに漏れてはいけない秘密鍵のため、
// Next.jsのAPI Route(サーバー側)からのみ使用する。
import ImageKit from "imagekit";

const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

if (!publicKey || !privateKey || !urlEndpoint) {
  console.warn(
    "[imagekit] IMAGEKIT_PUBLIC_KEY / IMAGEKIT_PRIVATE_KEY / IMAGEKIT_URL_ENDPOINT が未設定です。画像アップロードは失敗します。"
  );
}

export const imagekit = new ImageKit({
  publicKey: publicKey || "",
  privateKey: privateKey || "",
  urlEndpoint: urlEndpoint || "",
});
