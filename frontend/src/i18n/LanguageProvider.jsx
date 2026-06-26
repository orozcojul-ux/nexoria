/**
 * Global language provider for NEXORIA — powered by i18next + react-i18next.
 * Exposes lang, setLang, t(), fmtDate() for backward compatibility.
 */
import React, { createContext, useContext, useEffect, useCallback, useMemo } from "react";
import { I18nextProvider, useTranslation as useI18nNext } from "react-i18next";
import api, { getToken } from "@/lib/api";
import { LANGS, LOCALE_MAP, LANG_CODES } from "@/lib/languages";
import { persistLanguage } from "@/i18n/index";
import i18n, { appLangFromI18n, i18nLangFromApp } from "@/i18n/i18next";
import { finalizeTranslation, sanitizeI18nVars } from "@/lib/i18n-safe";

const LanguageContext = createContext(null);

function LanguageProviderInner({ children }) {
  const { t: i18nT, i18n: i18nInst } = useI18nNext();
  const lang = appLangFromI18n(i18nInst.language || "fr");

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l) => {
    if (!LANGS[l]) return;
    persistLanguage(l);
    i18nInst.changeLanguage(i18nLangFromApp(l));
    window.dispatchEvent(new CustomEvent("nexoria:language-changed", { detail: { language: l } }));
    if (getToken()) {
      api.put("/profile", { language: l }).catch(() => {});
    }
  }, [i18nInst]);

  const syncFromUser = useCallback((user) => {
    if (!user?.language || !LANGS[user.language]) return;
    const stored = localStorage.getItem("nexoria_language");
    // Ne pas écraser un choix explicite dans localStorage (ex. PT choisi à la main)
    if (stored && LANGS[stored] && stored !== user.language) return;
    persistLanguage(user.language);
    i18nInst.changeLanguage(i18nLangFromApp(user.language));
  }, [i18nInst]);

  /** Backward-compatible t(key, vars?) or t(key, fallbackString) */
  const t = useCallback((key, varsOrFallback) => {
    let vars = {};
    let fallback = "";
    if (typeof varsOrFallback === "string") {
      fallback = varsOrFallback;
    } else if (varsOrFallback && typeof varsOrFallback === "object") {
      vars = sanitizeI18nVars(varsOrFallback);
    }

    const run = (lng) => {
      const raw = i18nT(key, { lng, ...vars, defaultValue: fallback || "" });
      if (!raw || raw === key) return "";
      return finalizeTranslation(raw, vars, key);
    };

    let result = run(undefined);
    if (result) return result;

    if (lang !== "fr") {
      result = run("fr");
      if (result) return result;
    }
    if (lang !== "en") {
      result = run("en");
      if (result) return result;
    }

    if (fallback) return fallback;
    if (process.env.NODE_ENV === "development") {
      console.warn(`[i18n] Missing key: "${key}"`);
      return key;
    }
    return "—";
  }, [i18nT, lang]);

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
    () => ({ lang, locale: LOCALE_MAP[lang], setLang, syncFromUser, t, fmtDate, langs: LANGS, i18n: i18nInst }),
    [lang, setLang, syncFromUser, t, fmtDate, i18nInst],
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
      <LanguageProviderInner>{children}</LanguageProviderInner>
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

export { LANG_CODES };
