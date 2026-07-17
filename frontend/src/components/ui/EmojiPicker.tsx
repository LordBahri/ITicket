import { useState } from "react";
import { IconSmile } from "../icons";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "🙂", "😉", "😍",
  "😘", "🤔", "😅", "😢", "😭", "😡", "😱", "🥳",
  "👍", "👎", "🙏", "👏", "🙌", "💪", "🤝", "👋",
  "✅", "❌", "⚠️", "❗", "❓", "💡", "🔥", "🎉",
  "🚀", "📌", "📎", "📅", "⏰", "💻", "🖨️", "🔧",
  "❤️", "💙", "💯", "👌", "🤷", "😴", "☕", "📞",
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Emoji"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <IconSmile className="h-5 w-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-11 left-0 z-20 grid w-64 grid-cols-8 gap-0.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-lg hover:bg-slate-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
