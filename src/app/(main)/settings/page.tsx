"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const THEMES = [
  { id: "dark", name: "ダーク(既定)", color: "#313338" },
  { id: "light", name: "ライト", color: "#FFFFFF" },
  { id: "midnight", name: "ミッドナイト", color: "#000000" },
  { id: "ocean", name: "オーシャン", color: "#0F1B2D" },
  { id: "forest", name: "フォレスト", color: "#1A2820" },
  { id: "rose", name: "ローズ", color: "#2D1B24" },
];

export default function SettingsPage() {
  const { data: me, mutate } = useSWR("/api/me", fetcher);
  const [tab, setTab] = useState<"profile" | "appearance" | "password">("profile");
  const [msg, setMsg] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [theme, setTheme] = useState("dark");
  const [accentColor, setAccentColor] = useState("#5865F2");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  useEffect(() => {
    if (me) {
      setDisplayName(me.displayName || "");
      setBio(me.bio || "");
      setAvatarUrl(me.avatarUrl || "");
      setTheme(me.theme || "dark");
      setAccentColor(me.accentColor || "#5865F2");
      document.documentElement.className = me.theme || "dark";
      document.documentElement.style.setProperty("--accent", me.accentColor || "#5865F2");
    }
  }, [me]);

  const saveProfile = async () => {
    const res = await fetch("/api/me", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, bio, avatarUrl }),
    });
    if (res.ok) { setMsg("プロフィールを保存しました"); mutate(); }
  };
  const saveAppearance = async () => {
    const res = await fetch("/api/me", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme, accentColor }),
    });
    if (res.ok) {
      setMsg("外観を保存しました");
      document.documentElement.className = theme;
      document.documentElement.style.setProperty("--accent", accentColor);
      localStorage.setItem("theme", theme);
      mutate();
    }
  };
  const changePassword = async () => {
    if (newPassword !== newPassword2) { setMsg("新パスワードが一致しません"); return; }
    if (newPassword.length < 6) { setMsg("6文字以上必要です"); return; }
    const res = await fetch("/api/me", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "変更失敗");
    else { setMsg("パスワードを変更しました"); setCurrentPassword(""); setNewPassword(""); setNewPassword2(""); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">設定</h1>
      <div className="flex gap-2 border-b border-app mb-6">
        <TabBtn active={tab === "profile"} onClick={() => setTab("profile")}>プロフィール</TabBtn>
        <TabBtn active={tab === "appearance"} onClick={() => setTab("appearance")}>外観・テーマ</TabBtn>
        <TabBtn active={tab === "password"} onClick={() => setTab("password")}>パスワード</TabBtn>
      </div>

      {msg && <div className="mb-4 p-2 rounded bg-green-500/20 text-green-400 text-sm">{msg}</div>}

      {tab === "profile" && (
        <div className="card space-y-3">
          <div>
            <label className="text-sm text-muted">ユーザー名 (変更不可)</label>
            <input className="input" value={me?.username || ""} disabled />
          </div>
          <div>
            <label className="text-sm text-muted">表示名</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted">自己紹介</label>
            <textarea className="input min-h-[100px]" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} />
          </div>
          <div>
            <label className="text-sm text-muted">アバターURL (画像リンク)</label>
            <input className="input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>
          <button className="btn" onClick={saveProfile}>保存</button>
        </div>
      )}

      {tab === "appearance" && (
        <div className="card space-y-4">
          <div>
            <div className="font-bold mb-2">テーマ</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${theme === t.id ? "border-[var(--accent)]" : "border-transparent hover:border-app"}`}
                  style={{ background: t.color }}>
                  <div className="w-full h-16 rounded mb-2" style={{ background: t.color, border: "1px solid rgba(255,255,255,0.1)" }} />
                  <div className={`text-sm font-medium ${t.id === "light" ? "text-black" : "text-white"}`}>{t.name}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="font-bold mb-2">アクセントカラー</div>
            <div className="flex items-center gap-3">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-12 rounded cursor-pointer" />
              <input className="input flex-1" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
              <div className="flex gap-2">
                {["#5865F2","#EB459E","#57F287","#FEE75C","#ED4245","#00B0FF"].map(c => (
                  <button key={c} onClick={() => setAccentColor(c)}
                    className="w-8 h-8 rounded-full border-2 border-app" style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <button className="btn" onClick={saveAppearance}>外観を保存</button>
        </div>
      )}

      {tab === "password" && (
        <div className="card space-y-3">
          <div className="text-sm text-muted">
            💡 パスワードを忘れそうな場合は、安全な場所にメモしておくことを推奨します。
          </div>
          <div>
            <label className="text-sm text-muted">現在のパスワード</label>
            <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted">新しいパスワード</label>
            <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted">新しいパスワード (確認)</label>
            <input type="password" className="input" value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} />
          </div>
          <button className="btn" onClick={changePassword}>パスワードを変更</button>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, children, onClick }: any) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 transition-colors
        ${active ? "border-[var(--accent)] text-primary" : "border-transparent text-muted hover:text-primary"}`}>
      {children}
    </button>
  );
}
