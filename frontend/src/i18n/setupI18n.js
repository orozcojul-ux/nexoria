/**
 * Initialisation i18next — ressources statiques JSON (locales/).
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import pt from "./locales/pt-BR.json";
import nl from "./locales/nl.json";
import ja from "./locales/ja.json";
import { readStoredLanguage } from "./storage";
import { LANG_CODES } from "./languages";

const RESOURCES = {
  fr: { translation: fr },
  en: { translation: en },
  es: { translation: es },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
  nl: { translation: nl },
  ja: { translation: ja },
};

let initPromise = null;

/** Applique aussi les placeholders legacy `{var}` (en plus de `{{var}}`). */
export function applyLegacyInterpolation(text, vars) {
  if (!text || typeof text !== "string" || !vars || typeof vars !== "object") return text;
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v ?? ""));
  }
  return out;
}

const warnedKeys = new Set();

/** t() compatible NEXORIA : fallback fr, jamais de clé brute visible. */
export function createAppT(instance) {
  return function t(key, varsOrFallback) {
    let opts = {};
    if (typeof varsOrFallback === "string") {
      opts.defaultValue = varsOrFallback;
    } else if (varsOrFallback && typeof varsOrFallback === "object") {
      opts = { ...varsOrFallback };
    }

    let result = instance.t(key, opts);
    if (result === key) {
      result = instance.t(key, { ...opts, lng: "fr" });
    }
    if (result === key) {
      if (process.env.NODE_ENV === "development" && !warnedKeys.has(key)) {
        warnedKeys.add(key);
        console.warn(`[i18n] Missing key: "${key}"`);
      }
      return typeof varsOrFallback === "string" ? varsOrFallback : "";
    }

    if (typeof varsOrFallback === "object" && varsOrFallback) {
      result = applyLegacyInterpolation(result, varsOrFallback);
    }
    return result;
  };
}

export function setupI18n() {
  if (instanceReady()) return Promise.resolve(i18n);
  if (initPromise) return initPromise;

  const lng = readStoredLanguage(LANG_CODES);

  initPromise = i18n
    .use(initReactI18next)
    .init({
      resources: RESOURCES,
      lng,
      fallbackLng: "fr",
      supportedLngs: LANG_CODES,
      nonExplicitSupportedLngs: true,
      load: "languageOnly",
      interpolation: { escapeValue: false },
      returnEmptyString: false,
      returnNull: false,
      react: { useSuspense: false },
      debug: process.env.NODE_ENV === "development",
    })
    .then(() => i18n);

  return initPromise;
}

function instanceReady() {
  return Boolean(i18n.isInitialized);
}

export default i18n;
