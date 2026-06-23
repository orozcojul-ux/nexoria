/** Supported UI languages — single source of truth (mirrors backend VALID_LANGUAGES). */
export const LANGS = {
  fr: { code: "fr", label: "Français", flagCode: "fr" },
  en: { code: "en", label: "English", flagCode: "gb" },
  es: { code: "es", label: "Español", flagCode: "es" },
  de: { code: "de", label: "Deutsch", flagCode: "de" },
  it: { code: "it", label: "Italiano", flagCode: "it" },
  pt: { code: "pt", label: "Português BR", flagCode: "br" },
  nl: { code: "nl", label: "Nederlands", flagCode: "nl" },
  ja: { code: "ja", label: "日本語", flagCode: "jp" },
};

export const LANG_CODES = Object.keys(LANGS);

export const LOCALE_MAP = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-BR",
  nl: "nl-NL",
  ja: "ja-JP",
};

export const STORAGE_KEY = "nexoria_language";
export const LEGACY_STORAGE_KEY = "nexoria_lang";
