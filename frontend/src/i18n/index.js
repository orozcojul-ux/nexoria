/**
 * NEXORIA i18n — core utilities.
 * @see LanguageProvider.jsx — React provider
 * @see loadTranslations.js — merged dictionary entries
 */
import { LANG_CODES } from "@/lib/languages";
import { getTranslationEntries, flattenForLang, buildAllLangDictionaries } from "./loadTranslations";

export { getTranslationEntries, flattenForLang, buildAllLangDictionaries };

const warnedKeys = new Set();

/** Resolve string for lang — secondary langs prefer English over French. */
export function resolveTranslation(entry, lang) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (lang === "fr") return entry.fr ?? entry.en ?? null;
  if (lang === "en") return entry.en ?? entry.fr ?? null;
  return entry[lang] ?? entry.en ?? entry.fr ?? null;
}

/** Replace {{var}} and {var} placeholders. */
export function interpolate(text, vars = {}) {
  if (!text || typeof text !== "string") return text || "";
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    const val = String(v ?? "");
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), val);
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), val);
  }
  return out;
}

/**
 * Create t(key, params?) with missing-key dev warnings.
 * @param {Record<string, Record<string, string>>} entries
 * @param {string} lang
 */
export function createTranslator(entries, lang) {
  return function t(key, varsOrFallback) {
    let vars = {};
    let fallback = "";
    if (typeof varsOrFallback === "string") fallback = varsOrFallback;
    else if (varsOrFallback && typeof varsOrFallback === "object") vars = varsOrFallback;

    const entry = entries[key];
    const raw = resolveTranslation(entry, lang)
      ?? resolveTranslation(entry, "fr")
      ?? fallback
      ?? key;

    if (
      process.env.NODE_ENV === "development"
      && !warnedKeys.has(key)
      && (!entry || !resolveTranslation(entry, lang))
    ) {
      warnedKeys.add(key);
      if (!entry) {
        console.warn(`[i18n] Missing key: "${key}"`);
      } else if (!entry[lang]) {
        console.warn(`[i18n] Missing "${lang}" for key "${key}" — using fr fallback`);
      }
    }

    return interpolate(raw, vars);
  };
}

/** Read persisted language (nexoria_language, legacy nexoria_lang). */
export function readStoredLanguage(validCodes) {
  const codes = validCodes || LANG_CODES;
  const isValid = (c) => c && codes.includes(c);
  const primary = localStorage.getItem("nexoria_language");
  if (isValid(primary)) return primary;
  const legacy = localStorage.getItem("nexoria_lang");
  if (isValid(legacy)) {
    localStorage.setItem("nexoria_language", legacy);
    return legacy;
  }
  return "fr";
}

/** Persist language to localStorage (both keys during migration). */
export function persistLanguage(code) {
  localStorage.setItem("nexoria_language", code);
  localStorage.setItem("nexoria_lang", code);
}

/** Export flat dictionaries for JSON sync scripts. */
export function exportLangDictionaries() {
  const entries = getTranslationEntries();
  return buildAllLangDictionaries(entries, LANG_CODES);
}
