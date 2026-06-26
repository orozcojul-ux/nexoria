/**
 * i18next configuration — single engine for all NEXORIA UI translations.
 * Resources are built from merged JS modules (synced to locales/*.json via npm run i18n:sync).
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LANG_CODES } from "@/lib/languages";
import { readStoredLanguage } from "@/i18n/index";
import { getTranslationEntries, flattenForLang } from "@/i18n/loadTranslations";

const I18N_LANG_MAP = {
  pt: "pt-BR",
};

const I18N_TO_APP = {
  "pt-BR": "pt",
};

export function appLangFromI18n(code) {
  return I18N_TO_APP[code] || code;
}

export function i18nLangFromApp(code) {
  return I18N_LANG_MAP[code] || code;
}

function buildResources() {
  const entries = getTranslationEntries();
  const resources = {};
  for (const code of LANG_CODES) {
    const lng = i18nLangFromApp(code);
    resources[lng] = { translation: flattenForLang(entries, code) };
  }
  return resources;
}

const stored = readStoredLanguage(LANG_CODES);

i18n.use(initReactI18next).init({
  resources: buildResources(),
  lng: i18nLangFromApp(stored),
  fallbackLng: {
    en: ["fr"],
    es: ["fr", "en"],
    de: ["fr", "en"],
    it: ["fr", "en"],
    "pt-BR": ["fr", "en"],
    nl: ["fr", "en"],
    ja: ["fr", "en"],
    default: ["fr"],
  },
  supportedLngs: ["fr", "en", "es", "de", "it", "pt-BR", "nl", "ja"],
  keySeparator: false,
  nsSeparator: false,
  // NEXORIA strings use {var} (legacy createTranslator), not i18next default {{var}}.
  interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  returnEmptyString: false,
  returnNull: false,
  saveMissing: false,
  missingKeyHandler: (lng, _ns, key) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[i18n] Missing key "${key}" for "${lng}"`);
    }
  },
});

export default i18n;
