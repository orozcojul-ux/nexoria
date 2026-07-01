/**
 * Merged translation entries (key → { fr, en, es, … }).
 * Source modules: legacy inline keys, translations, extended, UI.
 * Later overrides win (same order as historical I18nContext).
 */
import { TRANSLATIONS } from "./translations.js";
import { TRANSLATIONS_EXTENDED } from "./translations-extended.js";
import { TRANSLATIONS_UI } from "./translations-ui.js";
import { TRANSLATIONS_LEGACY } from "./translations-legacy.js";
import { MAINTENANCE_TRANSLATIONS } from "./maintenanceTranslations.js";
import { TRANSLATIONS_PAGES } from "./translations-pages.js";
import { TRANSLATIONS_PAGES_EXT } from "./translations-pages-ext.js";
import { TRANSLATIONS_QUESTS_DATA } from "./translations-quests-data.js";
import { TRANSLATIONS_CHALLENGES_DATA } from "./translations-challenges-data.js";
import { TRANSLATIONS_CLASSES_DATA } from "./translations-classes-data.js";
import { TRANSLATIONS_EVENTS_UI } from "./translations-events-ui.js";
import { TRANSLATIONS_CATALOG_DATA } from "./translations-catalog-data.js";
import { TRANSLATIONS_SHOP_DATA } from "./translations-shop-data.js";
import { TRANSLATIONS_PROFILE_UI } from "./translations-profile-ui.js";
import { TRANSLATIONS_SHOP_EXT } from "./translations-shop-ext.js";
import { TRANSLATIONS_CHRONICLE_DATA } from "./translations-chronicle-data.js";
import { TRANSLATIONS_PAGES_MISC } from "./translations-pages-misc.js";
import { TRANSLATIONS_INVENTORY_UI } from "./translations-inventory-ui.js";
import { TRANSLATIONS_ORACLE_REFERRAL } from "./translations-oracle-referral.js";
import { TRANSLATIONS_PAGES_ZONES } from "./translations-pages-zones.js";
import { TRANSLATIONS_NOTIFICATIONS } from "./translations-notifications.js";
import { TRANSLATIONS_NEWS_UI } from "./translations-news-ui.js";
import { TRANSLATIONS_LEGAL } from "./translations-legal.js";
import { TRANSLATIONS_LEGAL_PRIVACY } from "./translations-legal-privacy.js";
import { TRANSLATIONS_NARIA } from "./translations-naria.js";
import { applyLocaleOverrides } from "./locale-overrides.js";
import { mergeTranslationModules } from "./mergeTranslations.js";
import { normalizeI18nPlaceholders } from "../lib/i18n-safe.js";

const SECONDARY_LANGS = ["es", "de", "it", "pt", "nl", "ja"];

/** Fill missing secondary langs from English, then French — better for international players. */
function hydrateSecondaryLangs(entries) {
  const out = {};
  for (const [key, entry] of Object.entries(entries)) {
    if (!entry || typeof entry !== "object") {
      out[key] = entry;
      continue;
    }
    const patched = { ...entry };
    for (const lang of SECONDARY_LANGS) {
      if (!patched[lang]) {
        patched[lang] = patched.en ?? patched.fr;
      }
    }
    out[key] = patched;
  }
  return out;
}

let _cache = null;

export function getTranslationEntries() {
  if (!_cache) {
    _cache = hydrateSecondaryLangs(applyLocaleOverrides(
      mergeTranslationModules(
        TRANSLATIONS_LEGACY,
        TRANSLATIONS,
        TRANSLATIONS_EXTENDED,
        TRANSLATIONS_UI,
        TRANSLATIONS_PAGES,
        TRANSLATIONS_PAGES_EXT,
        TRANSLATIONS_QUESTS_DATA,
        TRANSLATIONS_CHALLENGES_DATA,
        TRANSLATIONS_CLASSES_DATA,
        TRANSLATIONS_EVENTS_UI,
        TRANSLATIONS_CATALOG_DATA,
        TRANSLATIONS_SHOP_DATA,
        TRANSLATIONS_SHOP_EXT,
        TRANSLATIONS_PROFILE_UI,
        TRANSLATIONS_CHRONICLE_DATA,
        TRANSLATIONS_INVENTORY_UI,
        MAINTENANCE_TRANSLATIONS,
        TRANSLATIONS_ORACLE_REFERRAL,
        TRANSLATIONS_PAGES_ZONES,
        TRANSLATIONS_PAGES_MISC,
        TRANSLATIONS_NOTIFICATIONS,
        TRANSLATIONS_NEWS_UI,
        TRANSLATIONS_LEGAL,
        TRANSLATIONS_LEGAL_PRIVACY,
        TRANSLATIONS_NARIA,
      ),
    ));
  }
  return _cache;
}

/** Flat dictionary for one language: { "nav.home": "Accueil", … } */
export function flattenForLang(entries, lang) {
  const flat = {};
  for (const [key, entry] of Object.entries(entries)) {
    if (!entry || typeof entry !== "object") continue;
    let value;
    if (lang === "fr") {
      value = entry.fr ?? entry.en ?? key;
    } else if (lang === "en") {
      value = entry.en ?? entry.fr ?? key;
    } else {
      value = entry[lang] ?? entry.en ?? entry.fr ?? key;
    }
    flat[key] = normalizeI18nPlaceholders(value);
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
