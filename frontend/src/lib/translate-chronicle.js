/** Translate chronicle entries (structured i18n_key or legacy French text). */

import { tGame, translateBadge, translateQuest, translateItem, translateRarity, translateBuilding, translateShopItem } from "./translate-game";
import { translateClassName } from "./translate-class";

function interpolate(template, params) {
  if (!template || !params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
}

function resolveChronicleParams(t, params = {}) {
  const p = { ...params };
  if (p.badge_id) p.badge = translateBadge(t, { id: p.badge_id, badge_id: p.badge_id }).name;
  if (p.quest_id) p.quest = translateQuest(t, { quest_id: p.quest_id, name: p.quest || "" }).name;
  if (p.item_id) p.item = translateItem(t, { id: p.item_id, item_id: p.item_id, name: p.item || "" }).name;
  if (p.sku) p.item = translateShopItem(t, { sku: p.sku, name: p.item || "" }).name;
  if (p.rarity_id) p.rarity = translateRarity(t, p.rarity_id);
  if (p.building_id) p.building = translateBuilding(t, { id: p.building_id, name: p.building || "" }).name;
  if (p.class_id) p.className = translateClassName(t, p.class_id) || p.className || p.class_id;
  return p;
}

/** Translate a chronicle row from API. */
export function translateChronicle(t, entry) {
  if (!entry) return "";
  if (entry.i18n_key) {
    const params = resolveChronicleParams(t, entry.i18n_params || {});
    const template = tGame(t, entry.i18n_key, entry.text || "");
    return interpolate(template, params);
  }
  return entry.text || "";
}
