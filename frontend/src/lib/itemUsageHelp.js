/**
 * Item usage help — resolved via i18n keys in translations-pages-zones.js.
 */

const SKU_HELP = {
  scroll_rename: "inventory.help.scroll_rename",
  vip_scroll_rename: "inventory.help.scroll_rename",
  scroll_class_change: "inventory.help.scroll_class_change",
  vip_scroll_mutation: "inventory.help.scroll_class_change",
  key_chest_cosmic: "inventory.help.key_chest",
  vip_key_divine: "inventory.help.key_chest",
  vip_relic_box: "inventory.help.key_chest",
  summon_rift: "inventory.help.summon_rift",
  vip_rift_catalyst: "inventory.help.summon_rift",
  kingdom_inventory_slot: "inventory.help.kingdom_inventory_slot",
  kingdom_aether_mine: "inventory.help.kingdom_aether_mine",
  kingdom_treasury: "inventory.help.kingdom_treasury",
  kingdom_throne_room: "inventory.help.kingdom_throne_room",
};

const CATEGORY_HELP = {
  boost: "inventory.help.boost",
  chest: "inventory.help.chest",
  mount: "inventory.help.mount",
  aura: "inventory.help.aura",
  title: "inventory.help.title",
  pass: "inventory.help.pass",
  kingdom: "inventory.help.kingdom",
};

const RELIC_TYPE_HELP = {
  weapon: "inventory.help.relic.weapon",
  armor: "inventory.help.relic.armor",
  accessory: "inventory.help.relic.accessory",
  material: "inventory.help.relic.material",
  consumable: "inventory.help.relic.consumable",
  tome: "inventory.help.relic.tome",
  relic: "inventory.help.relic.relic",
};

const SHOP_TAB_HELP = {
  cosmetics: "inventory.help.shop.cosmetics.default",
  boosts: "inventory.help.shop.boosts",
  consumables: null,
  perks: "inventory.help.shop.perks",
  mounts: "inventory.help.shop.mounts",
  auras: "inventory.help.shop.auras",
};

export function itemActivationInfo(item, t) {
  if (!t) return "";
  const sku = item?.sku || "";
  if (SKU_HELP[sku]) return t(SKU_HELP[sku]);

  const cat = item?.category;
  if (cat === "cosmetic") {
    if (sku.startsWith("frame_")) return t("inventory.help.cosmetic_frame");
    if (sku.startsWith("banner_")) return t("inventory.help.cosmetic_banner");
    return t("inventory.help.cosmetic_default");
  }
  if (CATEGORY_HELP[cat]) return t(CATEGORY_HELP[cat]);
  if (item?.grant_xp) return t("inventory.help.grant_xp");
  return t("inventory.help.default");
}

export function relicUsageInfo(item, t) {
  if (!t) return "";
  const type = (item?.type || "relic").toLowerCase();
  const key = RELIC_TYPE_HELP[type] || RELIC_TYPE_HELP.relic;
  const parts = [t(key)];
  if (item?.quantity > 1) parts.push(t("inventory.help.relic.duplicates"));
  return parts.join(" ");
}

export function shopOwnedUsageInfo(tab, sku, meta, t) {
  if (!t) return "";
  if (meta?.sku || meta?.category) return itemActivationInfo(meta, t);

  if (tab === "cosmetics") {
    if (sku?.startsWith("frame_")) return t("inventory.help.shop.cosmetics.frame");
    if (sku?.startsWith("banner_")) return t("inventory.help.shop.cosmetics.banner");
    return t("inventory.help.shop.cosmetics.default");
  }
  if (tab === "consumables") return itemActivationInfo({ sku, category: "consumable", ...meta }, t);

  const tabKey = SHOP_TAB_HELP[tab];
  if (tabKey) return t(tabKey);
  return t("inventory.help.shop.default");
}
