"use client";
import { useState, useRef, useEffect } from "react";
import { SmilePlus } from "lucide-react";

const EMOJIS = [
  "😀","😂","😍","🤔","😮","😢","😡","👍","👎","❤️","🔥","🎉",
  "👏","🙏","😎","🤯","😭","😴","🤩","😱","💯","✅","❌","👀",
  "🚀","⭐","💡","🎮","🍕","☕","🐱","🐶",
];

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="text-muted hover:text-yellow-400 transition-colors" title="リアクションを追加">
        <SmilePlus size={18} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 bg-secondary border border-app rounded-lg p-2 shadow-xl grid grid-cols-8 gap-1 z-50 w-72">
          {EMOJIS.map((e) => (
            <button key={e} type="button"
              onClick={() => { onSelect(e); setOpen(false); }}
              className="text-lg hover:bg-tertiary rounded p-1 transition-colors">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
