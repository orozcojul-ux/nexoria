/** Map backend / display class names to i18n keys (class.*). */
const CLASS_I18N = {
  mage: "class.mage",
  guerrier: "class.warrior",
  warrior: "class.warrior",
  assassin: "class.assassin",
  paladin: "class.paladin",
  alchimiste: "class.alchemist",
  alchemist: "class.alchemist",
  explorateur: "class.explorer",
  explorer: "class.explorer",
  nécromancien: "class.necromancer",
  necromancien: "class.necromancer",
  necromancer: "class.necromancer",
  architecte: "class.architect",
  architect: "class.architect",
  chronomancien: "class.chronomancer",
  chronomancer: "class.chronomancer",
  inventeur: "class.inventor",
  inventor: "class.inventor",
};

export function translateClassName(t, className) {
  if (!className) return t("feed.default_hero");
  const key = CLASS_I18N[className.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")];
  if (key) {
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return className;
}
