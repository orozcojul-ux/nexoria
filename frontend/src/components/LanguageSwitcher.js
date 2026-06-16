import React, { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import FlagIcon from "@/components/FlagIcon";

export default function LanguageSwitcher({ compact = false, variant = "dropdown" }) {
  const { lang, setLang, langs, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const pickingRef = useRef(false);
  const list = Object.values(langs);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (code) => {
    if (code === lang || pickingRef.current) return;
    pickingRef.current = true;
    setOpen(false);
    setLang(code);
    toast.success(t("settings.language_changed"));
    window.setTimeout(() => { pickingRef.current = false; }, 400);
  };

  if (variant === "pills") {
    return (
      <div className="flex flex-wrap gap-2" data-testid="lang-switcher-pills">
        {list.map((l) => {
          const active = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); pick(l.code); }}
              data-testid={`lang-${l.code}`}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                active
                  ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  : "border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <FlagIcon code={l.flagCode} />
              <span>{l.label}</span>
              {active && <Check className="w-3 h-3 shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref} data-testid="lang-switcher">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:border-cyan-500/40 text-xs transition-all text-zinc-300"
        aria-expanded={open}
        aria-label={t("settings.language")}
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <FlagIcon code={langs[lang]?.flagCode} />
        <span className="font-mono-stat">{compact ? lang.toUpperCase() : langs[lang]?.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl border border-white/10 bg-[var(--nx-surface)] backdrop-blur-xl shadow-2xl p-1 max-h-72 overflow-y-auto">
          {list.map((l) => (
            <button
              key={l.code}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); pick(l.code); }}
              data-testid={`lang-${l.code}`}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                lang === l.code ? "bg-cyan-500/15 text-cyan-300" : "text-zinc-300 hover:bg-white/[0.04]"
              }`}
            >
              <FlagIcon code={l.flagCode} />
              <span className="flex-1 text-left">{l.label}</span>
              {lang === l.code && <Check className="w-3 h-3 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
