/** Build a translation entry { fr, en, es, de, it, pt, nl, ja } from a langs object. */
export function entry(langs) {
  const { fr, en, es, de, it, pt, nl, ja } = langs;
  return {
    fr,
    en,
    es: es ?? en,
    de: de ?? en,
    it: it ?? en,
    pt: pt ?? en,
    nl: nl ?? en,
    ja: ja ?? en,
  };
}

/** Expand keyed strings into TRANSLATIONS map entries. */
export function packEntries(rows) {
  const out = {};
  for (const [key, langs] of rows) {
    out[key] = entry(langs);
  }
  return out;
}
