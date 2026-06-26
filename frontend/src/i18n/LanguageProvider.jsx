/**
 * Provider global i18n — i18next + API NEXORIA (lang, setLang, t, fmtDate).
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { I18nextProvider } from "react-i18next";
import api, { getToken } from "@/lib/api";
import { LANGS, LOCALE_MAP } from "./languages";
import i18n, { createAppT } from "./setupI18n";
import { persistLanguage } from "./storage";

const LanguageContext = createContext(null);

function LanguageBridge({ children }) {
  const [lang, setLangState] = useState(() => i18n.language || "fr");

  useEffect(() => {
    const onChanged = (lng) => setLangState(lng);
    i18n.on("languageChanged", onChanged);
    return () => i18n.off("languageChanged", onChanged);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l) => {
    if (!LANGS[l]) return;
    persistLanguage(l);
    i18n.changeLanguage(l);
    window.dispatchEvent(new CustomEvent("nexoria:language-changed", { detail: { language: l } }));
    if (getToken()) {
      api.put("/profile", { language: l }).catch(() => {});
    }
  }, []);

  const syncFromUser = useCallback((user) => {
    if (user?.language && LANGS[user.language]) {
      persistLanguage(user.language);
      i18n.changeLanguage(user.language);
    }
  }, []);

  const t = useMemo(() => createAppT(i18n), [lang]);

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

export function LanguageProvider({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageBridge>{children}</LanguageBridge>
    </I18nextProvider>
  );
}

export const I18nProvider = LanguageProvider;

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}

export const useTranslation = useI18n;

export function useLanguage() {
  const { lang, setLang, langs } = useI18n();
  return { language: lang, setLanguage: setLang, languages: langs };
}
