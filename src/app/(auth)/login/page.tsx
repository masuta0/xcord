"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      username: username.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) setError("ユーザー名またはパスワードが違います");
    else router.push("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl accent-bg mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zm0 12l-10-5v10l10 5 10-5V9l-10 5z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary">SocialHub</h1>
          <p className="text-muted mt-2">アカウント名とパスワードだけで始められる</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-xl font-semibold">ログイン</h2>
          {error && <div className="text-sm p-2 rounded bg-red-500/20 text-red-400">{error}</div>}
          <div>
            <label className="block text-sm text-muted mb-1">ユーザー名</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">パスワード</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn w-full">
            {loading ? "ログイン中..." : "ログイン"}
          </button>
          <div className="text-center text-sm text-muted space-y-2 pt-2">
            <div>
              アカウントをお持ちでない?{" "}
              <Link href="/register" className="accent hover:underline">新規登録</Link>
            </div>
            <div>
              パスワードを忘れた?{" "}
              <Link href="/support" className="accent hover:underline">パスワード復旧</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
