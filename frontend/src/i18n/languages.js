/**
 * Langues supportées — alignées sur backend VALID_LANGUAGES (code pt, fichier pt-BR.json).
 */
export {
  LANGS,
  LANG_CODES,
  LOCALE_MAP,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
} from "@/lib/languages";

/** Affichage sélecteur (emoji + label localisé) */
export const LANG_SELECTOR_OPTIONS = [
  { code: "fr", emoji: "🇫🇷", label: "Français" },
  { code: "en", emoji: "🇬🇧", label: "English" },
  { code: "es", emoji: "🇪🇸", label: "Español" },
  { code: "de", emoji: "🇩🇪", label: "Deutsch" },
  { code: "it", emoji: "🇮🇹", label: "Italiano" },
  { code: "pt", emoji: "🇧🇷", label: "Português BR" },
  { code: "nl", emoji: "🇳🇱", label: "Nederlands" },
  { code: "ja", emoji: "🇯🇵", label: "日本語" },
];

export const SUPPORTED_LNGS = LANG_SELECTOR_OPTIONS.map((o) => o.code);
