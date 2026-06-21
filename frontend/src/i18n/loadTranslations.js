/**
 * Merged translation entries (key → { fr, en, es, … }).
 * Source modules: legacy inline keys, translations, extended, UI.
 * Later overrides win (same order as historical I18nContext).
 */
import { TRANSLATIONS } from "./translations.js";
import { TRANSLATIONS_EXTENDED } from "./translations-extended.js";
import { TRANSLATIONS_UI } from "./translations-ui.js";
import { TRANSLATIONS_LEGACY } from "./translations-legacy.js";

let _cache = null;

export function getTranslationEntries() {
  if (!_cache) {
    _cache = {
      ...TRANSLATIONS_LEGACY,
      ...TRANSLATIONS,
      ...TRANSLATIONS_EXTENDED,
      ...TRANSLATIONS_UI,
    };
  }
  return _cache;
}

/** Flat dictionary for one language: { "nav.home": "Accueil", … } */
export function flattenForLang(entries, lang) {
  const flat = {};
  for (const [key, entry] of Object.entries(entries)) {
    if (!entry || typeof entry !== "object") continue;
    flat[key] = entry[lang] ?? entry.fr ?? entry.en ?? key;
  }
  return flat;
}

/** All per-lang flat dictionaries (for JSON export / validation). */
export function buildAllLangDictionaries(entries, langCodes) {
  const out = {};
  for (const code of langCodes) {
    out[code] = flattenForLang(entries, code);
  }
  return out;
}
