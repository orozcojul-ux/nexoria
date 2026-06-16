import React, { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/contexts/I18nContext";

export default function ThemeSwitcher({ compact = false }) {
  const { themeId, themes, setTheme } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const current = themes[themeId];

  return (
    <div className="relative" ref={ref} data-testid="theme-switcher">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:border-violet-400/40 text-xs transition-all text-zinc-300"
        aria-expanded={open}
        title={t("theme.current", current?.label)}
      >
        <Palette className="w-3.5 h-3.5 text-violet-300" />
        <span className="font-mono-stat hidden sm:inline">{compact ? current?.icon : current?.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-white/10 bg-[var(--nx-surface)] backdrop-blur-xl shadow-2xl p-1.5">
          <div className="px-2 py-1.5 text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
            {t("theme.choose")}
          </div>
          {Object.values(themes).map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => { setTheme(th.id); setOpen(false); }}
              data-testid={`theme-${th.id}`}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-all ${
                themeId === th.id ? "bg-violet-500/15 text-violet-200" : "text-zinc-300 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-base">{th.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{th.label}</div>
                <div className="text-[10px] text-zinc-500 truncate">{th.desc}</div>
              </div>
              {themeId === th.id && <Check className="w-3.5 h-3.5 text-violet-300 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
