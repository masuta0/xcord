"use client";
import { useEffect } from "react";

// サーバーから取得したUIモード/テーマをクライアントの<html>に反映
export default function UiModeApplier({ uiMode, theme, accentColor }: { uiMode: string; theme?: string; accentColor?: string }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-ui-mode", uiMode);
    if (theme) { document.documentElement.className = theme; localStorage.setItem("theme", theme); }
    if (accentColor) document.documentElement.style.setProperty("--accent", accentColor);
  }, [uiMode, theme, accentColor]);
  return null;
}
