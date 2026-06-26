import React, { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { LANG_SELECTOR_OPTIONS } from "@/i18n/languages";
import FlagIcon from "@/components/FlagIcon";
import styles from "./LanguageSelector.module.css";

/**
 * Sélecteur de langue global NEXORIA — dark fantasy, globe + dropdown.
 */
export default function LanguageSelector({ compact = false, variant = "dropdown", className = "" }) {
  const { lang, setLang, langs, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const pickingRef = useRef(false);

  const options = LANG_SELECTOR_OPTIONS.filter((o) => langs[o.code]);

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

  const current = options.find((o) => o.code === lang) || options[0];

  if (variant === "pills") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`} data-testid="lang-switcher-pills">
        {options.map((l) => {
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
              <span aria-hidden>{l.emoji}</span>
              <FlagIcon code={langs[l.code]?.flagCode} />
              <span>{l.label}</span>
              {active && <Check className="w-3 h-3 shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={ref} data-testid="lang-switcher">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={styles.trigger}
        aria-expanded={open}
        aria-label={t("settings.language")}
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className={styles.emoji} aria-hidden>{current?.emoji}</span>
        <FlagIcon code={langs[lang]?.flagCode} />
        <span className="font-mono-stat">{compact ? lang.toUpperCase() : (current?.label || langs[lang]?.label)}</span>
      </button>
      {open && (
        <div className={styles.menu} role="listbox" aria-label={t("settings.language")}>
          {options.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={lang === l.code}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); pick(l.code); }}
              data-testid={`lang-${l.code}`}
              className={`${styles.option}${lang === l.code ? ` ${styles.optionActive}` : ""}`}
            >
              <span className={styles.emoji} aria-hidden>{l.emoji}</span>
              <FlagIcon code={langs[l.code]?.flagCode} />
              <span className="flex-1 text-left">{l.label}</span>
              {lang === l.code && <Check className="w-3 h-3 shrink-0 text-cyan-300" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
