import React, { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";

const EMOJI_GROUPS = [
  {
    label: "RPG",
    emojis: ["⚔️", "🛡️", "👑", "🔥", "⭐", "✨", "💀", "🏰", "🗡️", "🧙", "🐉", "💎", "🏆", "📜", "🎯", "⚡"],
  },
  {
    label: "Réactions",
    emojis: ["😀", "😂", "😍", "😎", "🤔", "😢", "😡", "👍", "👎", "❤️", "💯", "🙏", "👏", "🎉", "💪", "🤝"],
  },
  {
    label: "Nexoria",
    codes: [
      [":sword:", "⚔️"], [":shield:", "🛡️"], [":crown:", "👑"], [":fire:", "🔥"],
      [":star:", "⭐"], [":heart:", "❤️"], [":skull:", "💀"], [":sparkles:", "✨"],
    ],
  },
];

export default function EmojiPicker({ onPick, onPickCode, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        title="Émojis"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded border border-transparent text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        data-testid="emoji-picker-toggle"
      >
        <Smile className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-64 rounded-lg border border-white/15 bg-[#0c0a14] shadow-xl p-2 max-h-48 overflow-y-auto"
          data-testid="emoji-picker-panel"
        >
          {EMOJI_GROUPS.map((g) => (
            <div key={g.label} className="mb-2 last:mb-0">
              <div className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold mb-1 px-1">{g.label}</div>
              <div className="flex flex-wrap gap-0.5">
                {g.emojis?.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => { onPick(e); setOpen(false); }}
                    className="w-7 h-7 rounded hover:bg-white/10 text-base flex items-center justify-center"
                  >
                    {e}
                  </button>
                ))}
                {g.codes?.map(([code, preview]) => (
                  <button
                    key={code}
                    type="button"
                    title={code}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => { (onPickCode || onPick)(code); setOpen(false); }}
                    className="w-7 h-7 rounded hover:bg-white/10 text-base flex items-center justify-center"
                  >
                    {preview}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
