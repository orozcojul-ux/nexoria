/**
 * Generate translations-catalog-data.js from backend catalog export.
 * Run: node scripts/gen-catalog-i18n.mjs
 */
import { execSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const I18N = join(ROOT, "src", "i18n");
const LANGS = ["fr", "en", "es", "de", "it", "pt", "nl", "ja"];

function emitModule(exportName, rows) {
  const lines = rows.map(([key, l]) => {
    const parts = LANGS.map((lang) => `${lang}: ${JSON.stringify(l[lang])}`).join(", ");
    return `  [${JSON.stringify(key)}, { ${parts} }],`;
  });
  return `import { packEntries } from "./multi.js";

export const ${exportName} = packEntries([
${lines.join("\n")}
]);
`;
}

function row(key, langs) {
  return [key, langs];
}

/** Load catalog JSON from Python export. */
function loadCatalog() {
  const py = join(ROOT, "..", "backend", "scripts", "export_catalog.py");
  const raw = execSync(`python "${py}"`, { encoding: "utf8", cwd: join(ROOT, ".."), env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  return JSON.parse(raw);
}

// ─── Rarities (7) ───
const RARITY_LANGS = {
  common: {
    fr: "Commun", en: "Common", es: "Común", de: "Gewöhnlich", it: "Comune", pt: "Comum", nl: "Gewoon", ja: "コモン",
  },
  rare: {
    fr: "Rare", en: "Rare", es: "Raro", de: "Selten", it: "Raro", pt: "Raro", nl: "Zeldzaam", ja: "レア",
  },
  epic: {
    fr: "Épique", en: "Epic", es: "Épico", de: "Episch", it: "Epico", pt: "Épico", nl: "Episch", ja: "エピック",
  },
  legendary: {
    fr: "Légendaire", en: "Legendary", es: "Legendario", de: "Legendär", it: "Leggendario", pt: "Lendário", nl: "Legendarisch", ja: "レジェンダリー",
  },
  mythic: {
    fr: "Mythique", en: "Mythic", es: "Mítico", de: "Mythisch", it: "Mitico", pt: "Mítico", nl: "Mythisch", ja: "ミシック",
  },
  divine: {
    fr: "Divin", en: "Divine", es: "Divino", de: "Göttlich", it: "Divino", pt: "Divino", nl: "Goddelijk", ja: "ディバイン",
  },
  cosmic: {
    fr: "Cosmique", en: "Cosmic", es: "Cósmico", de: "Kosmisch", it: "Cosmico", pt: "Cósmico", nl: "Kosmisch", ja: "コズミック",
  },
};

// ─── Badge categories ───
const BADGE_CATEGORIES = {
  participation: {
    fr: "Participation", en: "Participation", es: "Participación", de: "Teilnahme", it: "Partecipazione", pt: "Participação", nl: "Deelname", ja: "参加",
  },
  social: {
    fr: "Social", en: "Social", es: "Social", de: "Sozial", it: "Sociale", pt: "Social", nl: "Sociaal", ja: "ソーシャル",
  },
  creation: {
    fr: "Création", en: "Creation", es: "Creación", de: "Kreation", it: "Creazione", pt: "Criação", nl: "Creatie", ja: "創造",
  },
  collection: {
    fr: "Collection", en: "Collection", es: "Colección", de: "Sammlung", it: "Collezione", pt: "Coleção", nl: "Collectie", ja: "コレクション",
  },
  secrets: {
    fr: "Secrets", en: "Secrets", es: "Secretos", de: "Geheimnisse", it: "Segreti", pt: "Segredos", nl: "Geheimen", ja: "秘密",
  },
};

// Per-entry multilingual overrides (loaded from companion JSON if present)
const OVERRIDES_PATH = join(dirname(fileURLToPath(import.meta.url)), "catalog-i18n-overrides.json");
let overrides = {};
try {
  overrides = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"));
} catch {
  // Will be created by companion step; fall back to fr + en only
}

function pick(key, fr, en) {
  const o = overrides[key];
  if (o) return o;
  return { fr, en, es: en, de: en, it: en, pt: en, nl: en, ja: en };
}

const catalog = loadCatalog();
const rows = [];

// Rarities
for (const [id, langs] of Object.entries(RARITY_LANGS)) {
  rows.push(row(`rarity.${id}`, langs));
}

// Badge categories
for (const [id, langs] of Object.entries(BADGE_CATEGORIES)) {
  rows.push(row(`badge.category.${id}`, langs));
}

// Badges
for (const b of catalog.badges) {
  const nameKey = `badge.${b.id}.name`;
  const descKey = `badge.${b.id}.description`;
  const enName = overrides[nameKey]?.en ?? b.name;
  const enDesc = overrides[descKey]?.en ?? b.description;
  rows.push(row(nameKey, pick(nameKey, b.name, enName)));
  rows.push(row(descKey, pick(descKey, b.description, enDesc)));
}

// Titles
for (const t of catalog.titles) {
  const key = `title.${t.id}`;
  rows.push(row(key, pick(key, t.name, overrides[key]?.en ?? t.name)));
}

// Items
for (const it of catalog.items) {
  const key = `item.${it.id}`;
  rows.push(row(key, pick(key, it.name, overrides[key]?.en ?? it.name)));
}

// Skills
for (const s of catalog.skills) {
  const nameKey = `skill.${s.id}.name`;
  const descKey = `skill.${s.id}.description`;
  rows.push(row(nameKey, pick(nameKey, s.name, overrides[nameKey]?.en ?? s.name)));
  rows.push(row(descKey, pick(descKey, s.description, overrides[descKey]?.en ?? s.description)));
}

// Buildings
for (const b of catalog.buildings) {
  const nameKey = `building.${b.id}.name`;
  const descKey = `building.${b.id}.description`;
  rows.push(row(nameKey, pick(nameKey, b.name, overrides[nameKey]?.en ?? b.name)));
  rows.push(row(descKey, pick(descKey, b.description, overrides[descKey]?.en ?? b.description)));
}

// Craft resources
for (const r of catalog.craft_resources) {
  const key = `craft.resource.${r.id}`;
  rows.push(row(key, pick(key, r.name, overrides[key]?.en ?? r.name)));
}

// Craft recipes
for (const r of catalog.craft_recipes) {
  const nameKey = `craft.recipe.${r.id}.name`;
  const descKey = `craft.recipe.${r.id}.description`;
  rows.push(row(nameKey, pick(nameKey, r.name, overrides[nameKey]?.en ?? r.name)));
  if (r.description) {
    rows.push(row(descKey, pick(descKey, r.description, overrides[descKey]?.en ?? r.description)));
  }
}

// Craft tiers
for (const t of catalog.craft_tiers || []) {
  const key = `craft.tier.${t.id}`;
  rows.push(row(key, pick(key, t.label, overrides[key]?.en ?? t.label)));
}

// UI keys for badges/profile/inventory
const UI = [
  ["catalog.badge.mysterious", {
    fr: "Badge Mystérieux", en: "Mysterious Badge", es: "Insignia Misteriosa", de: "Geheimnisvolles Abzeichen",
    it: "Distintivo Misterioso", pt: "Emblema Misterioso", nl: "Mysterieuze Badge", ja: "謎のバッジ",
  }],
  ["profile.badges.title", {
    fr: "BADGES", en: "BADGES", es: "INSIGNIAS", de: "ABZEICHEN", it: "DISTINTIVI", pt: "EMBLEMAS", nl: "BADGES", ja: "バッジ",
  }],
  ["profile.badges.empty", {
    fr: "Aucun badge débloqué — explorez le monde !",
    en: "No badges unlocked yet — explore the realm!",
    es: "Ninguna insignia desbloqueada — ¡explora el reino!",
    de: "Noch keine Abzeichen freigeschaltet — erkunde das Reich!",
    it: "Nessun distintivo sbloccato — esplora il regno!",
    pt: "Nenhum emblema desbloqueado — explore o reino!",
    nl: "Nog geen badges ontgrendeld — verken het rijk!",
    ja: "バッジはまだありません — 世界を探索しましょう！",
  }],
  ["item.type.weapon", { fr: "Arme", en: "Weapon", es: "Arma", de: "Waffe", it: "Arma", pt: "Arma", nl: "Wapen", ja: "武器" }],
  ["item.type.armor", { fr: "Armure", en: "Armor", es: "Armadura", de: "Rüstung", it: "Armatura", pt: "Armadura", nl: "Pantser", ja: "防具" }],
  ["item.type.consumable", { fr: "Consommable", en: "Consumable", es: "Consumible", de: "Verbrauchsgut", it: "Consumabile", pt: "Consumível", nl: "Verbruiksartikel", ja: "消耗品" }],
  ["item.type.material", { fr: "Matériau", en: "Material", es: "Material", de: "Material", it: "Materiale", pt: "Material", nl: "Materiaal", ja: "素材" }],
  ["item.type.accessory", { fr: "Accessoire", en: "Accessory", es: "Accesorio", de: "Accessoire", it: "Accessorio", pt: "Acessório", nl: "Accessoire", ja: "アクセサリー" }],
  ["item.type.relic", { fr: "Relique", en: "Relic", es: "Reliquia", de: "Reliquie", it: "Reliquia", pt: "Relíquia", nl: "Relikwie", ja: "遺物" }],
  ["item.type.tome", { fr: "Tome", en: "Tome", es: "Tomo", de: "Foliant", it: "Tomo", pt: "Tomo", nl: "Tome", ja: "魔導書" }],
  ["item.type.cosmetic", { fr: "Cosmétique", en: "Cosmetic", es: "Cosmético", de: "Kosmetik", it: "Cosmetico", pt: "Cosmético", nl: "Cosmetisch", ja: "コスメ" }],
];
for (const [key, langs] of UI) rows.push(row(key, langs));

writeFileSync(join(I18N, "translations-catalog-data.js"), emitModule("TRANSLATIONS_CATALOG_DATA", rows));
console.log("catalog:", rows.length, "keys");
if (!Object.keys(overrides).length) {
  console.warn("Tip: add scripts/catalog-i18n-overrides.json for full ES/DE/IT/PT/NL/JA translations.");
}
