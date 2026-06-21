#!/usr/bin/env node
/**
 * Report missing translation keys across languages (fr = source of truth).
 * Run: npm run i18n:check (from frontend/)
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.resolve(__dirname, "../src/i18n");
const LANGS = ["fr", "en", "es", "de", "it", "pt", "nl", "ja"];

const { getTranslationEntries } = await import(
  pathToFileURL(path.join(i18nDir, "loadTranslations.js")).href
);

const entries = getTranslationEntries();
const allKeys = Object.keys(entries).sort();
let issues = 0;

console.log(`Checking ${allKeys.length} keys across ${LANGS.length} languages…\n`);

for (const key of allKeys) {
  const entry = entries[key];
  if (!entry || typeof entry !== "object") {
    console.warn(`[missing entry] ${key}`);
    issues += 1;
    continue;
  }
  for (const lang of LANGS) {
    if (!entry[lang] && lang !== "fr") {
      const hasFr = Boolean(entry.fr);
      const hasEn = Boolean(entry.en);
      if (!hasFr && !hasEn) {
        console.warn(`[no fallback] ${key} — missing ${lang} (and no fr/en)`);
        issues += 1;
      } else if (!entry[lang]) {
        console.warn(`[missing ${lang}] ${key} (will fallback to fr)`);
        issues += 1;
      }
    }
  }
}

if (issues === 0) {
  console.log("All keys have fr source; other langs fall back where needed.");
} else {
  console.log(`\n${issues} issue(s) reported (fallbacks may still work at runtime).`);
  process.exitCode = 1;
}
