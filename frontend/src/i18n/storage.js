import { LANG_CODES } from "./languages";

/** Read persisted language (nexoria_language, legacy nexoria_lang). */
export function readStoredLanguage(validCodes = LANG_CODES) {
  const isValid = (c) => c && validCodes.includes(c);
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
