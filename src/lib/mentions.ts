// @username 形式のメンションを抽出するユーティリティ
export function extractMentions(content: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_]{3,20})/g) || [];
  const usernames = matches.map((m) => m.slice(1).toLowerCase());
  return Array.from(new Set(usernames));
}

// contentを解析して { type:'text'|'mention', value } のトークン配列に分割(表示用)
export function tokenizeContent(content: string): { type: "text" | "mention"; value: string }[] {
  const parts: { type: "text" | "mention"; value: string }[] = [];
  const regex = /@([a-zA-Z0-9_]{3,20})/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    if (match.index > lastIndex) parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    parts.push({ type: "mention", value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push({ type: "text", value: content.slice(lastIndex) });
  return parts;
}
