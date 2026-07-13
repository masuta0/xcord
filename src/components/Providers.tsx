"use client";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // ローカル保存のテーマを反映
    const theme = localStorage.getItem("theme") || "dark";
    document.documentElement.className = theme;
  }, []);
  return <SessionProvider>{children}</SessionProvider>;
}
