"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== password2) return setError("パスワードが一致しません");
    if (password.length < 6)   return setError("パスワードは6文字以上");
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password, displayName: displayName.trim() || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "登録に失敗しました");
      setLoading(false);
      return;
    }
    await signIn("credentials", { username: username.trim(), password, redirect: false });
    setLoading(false);
    router.push("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl accent-bg mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary">新規登録</h1>
          <p className="text-muted mt-2">メールアドレス不要 - すぐに始められる</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <div className="text-sm p-2 rounded bg-red-500/20 text-red-400">{error}</div>}
          <div>
            <label className="block text-sm text-muted mb-1">ユーザー名 (英数字と_のみ、3〜20文字)</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} pattern="[a-zA-Z0-9_]{3,20}" required autoFocus />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">表示名 (任意)</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">パスワード (6文字以上)</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">パスワード (確認)</label>
            <input type="password" className="input" value={password2} onChange={(e) => setPassword2(e.target.value)} minLength={6} required />
          </div>
          <div className="text-xs text-muted bg-tertiary p-2 rounded">
            ⚠️ メールアドレスを使わないため、パスワードを忘れると復旧に管理者対応が必要です。安全な場所に保管してください。
          </div>
          <button type="submit" disabled={loading} className="btn w-full">
            {loading ? "登録中..." : "アカウント作成"}
          </button>
          <div className="text-center text-sm text-muted">
            既にアカウントをお持ち?{" "}
            <Link href="/login" className="accent hover:underline">ログイン</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
