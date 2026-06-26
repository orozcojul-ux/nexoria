/**
 * NEXORIA i18n — point d'entrée.
 * Runtime : i18next + JSON (locales/) via setupI18n.js
 * Authoring : modules translations-*.js → npm run i18n:sync
 */
export { default as i18n, setupI18n, createAppT, applyLegacyInterpolation } from "./setupI18n";
export { readStoredLanguage, persistLanguage } from "./storage";
export { LANGS, LANG_CODES, LOCALE_MAP, LANG_SELECTOR_OPTIONS, SUPPORTED_LNGS } from "./languages";
export { getTranslationEntries, flattenForLang, buildAllLangDictionaries } from "./loadTranslations";

/** @deprecated Utiliser setupI18n + createAppT — conservé pour scripts */
export { createTranslator, resolveTranslation, interpolate, exportLangDictionaries } from "./core";
