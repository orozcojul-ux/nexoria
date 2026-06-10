import React from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Globe } from "lucide-react";

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, langs } = useI18n();
  const list = Object.values(langs);
  return (
    <div className={`relative group inline-block`} data-testid="lang-switcher">
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 hover:border-cyan-500/40 text-xs transition-all">
        <Globe className="w-3 h-3" />
        <span className="font-mono-stat">{langs[lang]?.flag} {compact ? lang.toUpperCase() : langs[lang]?.label}</span>
      </button>
      <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
        <div className="glass rounded-md p-1 min-w-[140px] shadow-xl">
          {list.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              data-testid={`lang-${l.code}`}
              className={`w-full text-left px-3 py-1.5 rounded text-xs hover:bg-cyan-500/10 ${lang === l.code ? "bg-cyan-500/10 text-cyan-300" : "text-zinc-300"}`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
