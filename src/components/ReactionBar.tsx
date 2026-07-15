"use client";
import EmojiPicker from "./EmojiPicker";

export interface ReactionItem { emoji: string; count: number; reacted: boolean; }

export default function ReactionBar({ reactions, onToggle }: { reactions: ReactionItem[]; onToggle: (emoji: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
      {reactions.filter(r => r.count > 0).map((r) => (
        <button key={r.emoji} onClick={() => onToggle(r.emoji)}
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors
            ${r.reacted ? "border-[var(--accent)] bg-[var(--accent)]/15" : "border-app hover:bg-tertiary"}`}>
          <span>{r.emoji}</span><span className="text-muted">{r.count}</span>
        </button>
      ))}
      <EmojiPicker onSelect={onToggle} />
    </div>
  );
}

// 生のリアクション配列([{userId, emoji}])を集計してReactionItem[]に変換
export function aggregateReactions(raw: { userId: string; emoji: string }[], meId?: string): ReactionItem[] {
  const map = new Map<string, ReactionItem>();
  for (const r of raw || []) {
    if (!map.has(r.emoji)) map.set(r.emoji, { emoji: r.emoji, count: 0, reacted: false });
    const item = map.get(r.emoji)!;
    item.count++;
    if (r.userId === meId) item.reacted = true;
  }
  return Array.from(map.values());
}
