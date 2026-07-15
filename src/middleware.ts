import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// ログイン(=アカウント登録済み)していないユーザーは、サイトのどこを開いても
// 必ずログイン/新規登録画面に誘導する。ログアウト時も同様。
// 公開してよいのは: ログイン/登録/パスワード復旧申請フォーム/認証API/ヘルスチェックのみ。
const PUBLIC_PATHS = ["/login", "/register", "/support"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/register", "/api/support", "/api/health"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
  if (isPublicPage || isPublicApi) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // API: 未認証は401(各ルート内でも二重チェック済みだが、ここでも早期return)
  if (pathname.startsWith("/api/")) {
    if (!token) return NextResponse.json({ error: "未認証" }, { status: 401 });
    return NextResponse.next();
  }

  // ページ: 未認証は問答無用でログイン画面へ
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 以下を除く全パスに適用:
     * - _next (Next.jsの内部アセット)
     * - favicon.ico など静的ファイル
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
