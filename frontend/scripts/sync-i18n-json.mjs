#!/usr/bin/env node
/**
 * Sync flat JSON dictionaries from JS translation modules → locales/
 * Run: npm run i18n:sync (from frontend/)
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.resolve(__dirname, "../src/i18n");
const outDir = path.join(i18nDir, "locales");
const legacyOutDir = path.join(i18nDir, "translations");

const LANGS = ["fr", "en", "es", "de", "it", "pt", "nl", "ja"];
const FILE_NAMES = {
  fr: "fr.json",
  en: "en.json",
  es: "es.json",
  de: "de.json",
  it: "it.json",
  pt: "pt-BR.json",
  nl: "nl.json",
  ja: "ja.json",
};

const { getTranslationEntries, buildAllLangDictionaries } = await import(
  pathToFileURL(path.join(i18nDir, "loadTranslations.js")).href
);

const entries = getTranslationEntries();
const dicts = buildAllLangDictionaries(entries, LANGS);

mkdirSync(outDir, { recursive: true });
mkdirSync(legacyOutDir, { recursive: true });

for (const lang of LANGS) {
  const payload = `${JSON.stringify(dicts[lang], null, 2)}\n`;
  const primary = path.join(outDir, FILE_NAMES[lang]);
  const legacy = path.join(legacyOutDir, FILE_NAMES[lang]);
  writeFileSync(primary, payload);
  writeFileSync(legacy, payload);
  console.log(`Wrote ${primary} (${Object.keys(dicts[lang]).length} keys)`);
}

console.log("i18n JSON sync complete (locales/ + translations/).");
