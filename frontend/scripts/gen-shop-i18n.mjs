/**
 * Generate translations-shop-data.js from shop-i18n-overrides.json.
 * Run: node scripts/gen-shop-i18n.mjs
 */
import { readFileSync, writeFileSync } from "fs";
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

const overrides = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "shop-i18n-overrides.json"), "utf8"),
);

const rows = Object.entries(overrides).map(([key, langs]) => row(key, langs));

// Shop UI strings
const UI = [
  ["shop.chest.opened", {
    fr: "Coffre ouvert !", en: "Chest opened!", es: "¡Cofre abierto!", de: "Truhe geöffnet!",
    it: "Forziere aperto!", pt: "Baú aberto!", nl: "Kist geopend!", ja: "宝箱を開けた！",
  }],
  ["shop.chest.added_one", {
    fr: "1 relique ajoutée à votre inventaire", en: "1 relic added to your inventory",
    es: "1 reliquia añadida a tu inventario", de: "1 Reliquie zum Inventar hinzugefügt",
    it: "1 reliquia aggiunta al tuo inventario", pt: "1 relíquia adicionada ao seu inventário",
    nl: "1 relikwie toegevoegd aan je inventaris", ja: "遺物が1つインベントリに追加されました",
  }],
  ["shop.chest.added_other", {
    fr: "{count} reliques ajoutées à votre inventaire", en: "{count} relics added to your inventory",
    es: "{count} reliquias añadidas a tu inventario", de: "{count} Reliquien zum Inventar hinzugefügt",
    it: "{count} reliquie aggiunte al tuo inventario", pt: "{count} relíquias adicionadas ao seu inventário",
    nl: "{count} relikwieën toegevoegd aan je inventaris", ja: "遺物が{count}個インベントリに追加されました",
  }],
  ["shop.chest.collect", {
    fr: "Récupérer le butin", en: "Collect loot", es: "Recoger el botín", de: "Beute einsammeln",
    it: "Raccogli il bottino", pt: "Recolher o saque", nl: "Buit verzamelen", ja: "戦利品を回収",
  }],
  ["shop.boost.active", {
    fr: "Effets actifs", en: "Active effects", es: "Efectos activos", de: "Aktive Effekte",
    it: "Effetti attivi", pt: "Efeitos ativos", nl: "Actieve effecten", ja: "アクティブ効果",
  }],
  ["shop.item.howToUse", {
    fr: "Comment l'utiliser", en: "How to use", es: "Cómo usarlo", de: "So verwendest du es",
    it: "Come usarlo", pt: "Como usar", nl: "Hoe te gebruiken", ja: "使い方",
  }],
  ["shop.item.infoAria", {
    fr: "Informations sur l'article", en: "Item information", es: "Información del artículo",
    de: "Artikelinformationen", it: "Informazioni sull'oggetto", pt: "Informações do item",
    nl: "Artikelinformatie", ja: "アイテム情報",
  }],
  ["shop.boost.xp", {
    fr: "XP", en: "XP", es: "XP", de: "XP", it: "XP", pt: "XP", nl: "XP", ja: "XP",
  }],
  ["shop.boost.ecus", {
    fr: "Écus", en: "Écus", es: "Écus", de: "Écus", it: "Écus", pt: "Écus", nl: "Écus", ja: "エキュー",
  }],
  ["shop.boost.luck", {
    fr: "Chance", en: "Luck", es: "Suerte", de: "Glück", it: "Fortuna", pt: "Sorte", nl: "Geluk", ja: "幸運",
  }],
  ["shop.featured.cosmicBlades.title", {
    fr: "Lames Cosmiques", en: "Cosmic Blades", es: "Hojas Cósmicas", de: "Kosmische Klingen",
    it: "Lame Cosmiche", pt: "Lâminas Cósmicas", nl: "Kosmische Klingen", ja: "宇宙の刃",
  }],
  ["shop.featured.cosmicBlades.sub", {
    fr: "Collection Légendaire", en: "Legendary Collection", es: "Colección Legendaria", de: "Legendäre Kollektion",
    it: "Collezione Leggendaria", pt: "Coleção Lendária", nl: "Legendarische collectie", ja: "レジェンダリーコレクション",
  }],
  ["shop.featured.voidArmor.title", {
    fr: "Armures du Néant", en: "Void Armors", es: "Armaduras del Vacío", de: "Leeren-Rüstungen",
    it: "Armature del Vuoto", pt: "Armaduras do Vazio", nl: "Leegte-pantsers", ja: "虚空の鎧",
  }],
  ["shop.featured.voidArmor.sub", {
    fr: "Édition Cosmique", en: "Cosmic Edition", es: "Edición Cósmica", de: "Kosmische Edition",
    it: "Edizione Cosmica", pt: "Edição Cósmica", nl: "Kosmische editie", ja: "コズミック版",
  }],
  ["shop.featured.mythicMounts.title", {
    fr: "Montures Mythiques", en: "Mythic Mounts", es: "Monturas Míticas", de: "Mythische Reittiere",
    it: "Montature Mitiche", pt: "Montarias Míticas", nl: "Mythische rijdieren", ja: "ミシックマウント",
  }],
  ["shop.featured.mythicMounts.sub", {
    fr: "Compagnons Stellaires", en: "Stellar Companions", es: "Compañeros Estelares", de: "Sternenbegleiter",
    it: "Compagni Stellari", pt: "Companheiros Estelares", nl: "Sterrenmetgezellen", ja: "星の相棒",
  }],
  ["shop.featured.divineChests.title", {
    fr: "Coffres Divins", en: "Divine Chests", es: "Cofres Divinos", de: "Göttliche Truhen",
    it: "Forzieri Divini", pt: "Baús Divinos", nl: "Goddelijke kisten", ja: "神聖な宝箱",
  }],
  ["shop.featured.divineChests.sub", {
    fr: "Trésors Sacrés", en: "Sacred Treasures", es: "Tesoros Sagrados", de: "Heilige Schätze",
    it: "Tesori Sacri", pt: "Tesouros Sagrados", nl: "Heilige schatten", ja: "聖なる宝物",
  }],
];
for (const [key, langs] of UI) rows.push(row(key, langs));

writeFileSync(join(I18N, "translations-shop-data.js"), emitModule("TRANSLATIONS_SHOP_DATA", rows));
console.log("shop:", rows.length, "keys");
