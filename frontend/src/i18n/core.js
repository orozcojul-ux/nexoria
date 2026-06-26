/**
 * NEXORIA i18n — utilitaires legacy (scripts sync / tests).
 */
import { LANG_CODES } from "./languages";
import { getTranslationEntries, flattenForLang, buildAllLangDictionaries } from "./loadTranslations";

export { getTranslationEntries, flattenForLang, buildAllLangDictionaries };

const warnedKeys = new Set();

export function resolveTranslation(entry, lang) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  return entry[lang] ?? entry.fr ?? entry.en ?? null;
}

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
      if (!entry) console.warn(`[i18n] Missing key: "${key}"`);
      else console.warn(`[i18n] Missing "${lang}" for key "${key}" — using fr fallback`);
    }

    return interpolate(raw, vars);
  };
}

export function exportLangDictionaries() {
  const entries = getTranslationEntries();
  return buildAllLangDictionaries(entries, LANG_CODES);
}
