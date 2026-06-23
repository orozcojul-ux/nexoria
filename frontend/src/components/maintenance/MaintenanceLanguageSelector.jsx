import React, { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import FlagIcon from "@/components/FlagIcon";

export default function MaintenanceLanguageSelector() {
  const { lang, setLang, langs, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const list = Object.values(langs);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (code) => {
    if (code === lang) return;
    setLang(code);
    setOpen(false);
  };

  return (
    <div className="maint-lang-selector" ref={ref} data-testid="maintenance-language-selector">
      <button
        type="button"
        className="maint-lang-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("maintenance.lang.select")}
      >
        <Globe className="maint-lang-globe" strokeWidth={1.75} aria-hidden />
        <span className="maint-lang-current">{langs[lang]?.label || lang.toUpperCase()}</span>
      </button>
      {open && (
        <div className="maint-lang-menu" role="listbox" aria-label={t("maintenance.lang.label")}>
          {list.map((l) => {
            const active = lang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={active}
                className={`maint-lang-option${active ? " maint-lang-option--active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(l.code)}
                data-testid={`maint-lang-${l.code}`}
              >
                <FlagIcon code={l.flagCode} />
                <span>{l.label}</span>
                {active && <Check className="maint-lang-check" strokeWidth={2} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
