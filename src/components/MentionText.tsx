"use client";
import Link from "next/link";
import { tokenizeContent } from "@/lib/mentions";

export default function MentionText({ content }: { content: string }) {
  const tokens = tokenizeContent(content);
  return (
    <span className="whitespace-pre-wrap break-words">
      {tokens.map((t, i) =>
        t.type === "mention" ? (
          <Link key={i} href={`/profile/${t.value}`} className="accent hover:underline font-medium">
            @{t.value}
          </Link>
        ) : (
          <span key={i}>{t.value}</span>
        )
      )}
    </span>
  );
}
