/**
 * Global language provider for NEXORIA.
 * Wraps the entire app — exposes lang, setLang, t(), fmtDate().
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api, { getToken } from "@/lib/api";
import { LANGS, LOCALE_MAP, LANG_CODES } from "@/lib/languages";
import {
  createTranslator,
  readStoredLanguage,
  persistLanguage,
} from "@/i18n/index";
import { getTranslationEntries } from "@/i18n/loadTranslations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const entries = useMemo(() => getTranslationEntries(), []);

  const [lang, setLangState] = useState(() => readStoredLanguage(LANG_CODES));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l) => {
    if (!LANGS[l]) return;
    persistLanguage(l);
    setLangState(l);
    window.dispatchEvent(new CustomEvent("nexoria:language-changed", { detail: { language: l } }));
    if (getToken()) {
      api.put("/profile", { language: l }).catch(() => {});
    }
  }, []);

  const syncFromUser = useCallback((user) => {
    if (user?.language && LANGS[user.language]) {
      persistLanguage(user.language);
      setLangState(user.language);
    }
  }, []);

  const t = useCallback(
    (key, varsOrFallback) => createTranslator(entries, lang)(key, varsOrFallback),
    [entries, lang],
  );

  const fmtDate = useCallback((iso, opts = {}) => {
    if (!iso) return "—";
    const locale = LOCALE_MAP[lang] || "fr-FR";
    return new Date(iso).toLocaleString(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      ...opts,
    });
  }, [lang]);

  const value = useMemo(
    () => ({ lang, locale: LOCALE_MAP[lang], setLang, syncFromUser, t, fmtDate, langs: LANGS }),
    [lang, setLang, syncFromUser, t, fmtDate],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/** @deprecated Use LanguageProvider — kept for backward compatibility */
export const I18nProvider = LanguageProvider;

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}

/** Alias for useI18n */
export const useTranslation = useI18n;

export function useLanguage() {
  const { lang, setLang, langs } = useI18n();
  return { language: lang, setLanguage: setLang, languages: langs };
}
