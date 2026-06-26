const EXTRA_LANGS = ["es", "de", "it", "pt", "nl", "ja"];

/**
 * Merge translation entries without letting T() English copies wipe legacy translations.
 * Later modules win for fr/en; other langs kept unless explicitly translated (≠ en).
 */
export function mergeEntry(prev, next) {
  if (!prev) return { ...next };
  const merged = {
    ...prev,
    fr: next.fr ?? prev.fr,
    en: next.en ?? prev.en,
  };
  for (const lang of EXTRA_LANGS) {
    const nv = next[lang];
    const pv = prev[lang];
    if (nv !== undefined && nv !== next.en) {
      merged[lang] = nv;
    } else if (pv !== undefined) {
      merged[lang] = pv;
    } else if (nv !== undefined) {
      merged[lang] = nv;
    }
  }
  return merged;
}

export function mergeTranslationModules(...modules) {
  const out = {};
  for (const mod of modules) {
    if (!mod || typeof mod !== "object") continue;
    for (const [key, entry] of Object.entries(mod)) {
      if (!entry || typeof entry !== "object") continue;
      out[key] = mergeEntry(out[key], entry);
    }
  }
  return out;
}
