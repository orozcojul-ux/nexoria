/** Build craft guide content from i18n keys (replaces hardcoded CRAFT_GUIDE). */
export function getCraftGuide(t) {
  return {
    intro: t("craft.guide.intro"),
    steps: [0, 1, 2, 3, 4, 5].map((i) => t(`craft.guide.step${i}`)),
    tips: [0, 1, 2, 3, 4, 5].map((i) => t(`craft.guide.tip${i}`)),
    successRates: [
      { rarity: t("craft.guide.rarity.common"), rate: "100%", color: "#9CA3AF" },
      { rarity: t("craft.guide.rarity.rare"), rate: "80%", color: "#3B82F6" },
      { rarity: t("craft.guide.rarity.epic"), rate: "55%", color: "#9D4CDD" },
      { rarity: t("craft.guide.rarity.legendary"), rate: "25%", color: "#F97316" },
    ],
    resources: [
      { name: t("craft.cosmicDust"), source: t("craft.guide.res.dust") },
      { name: t("craft.guide.res.crystal"), source: t("craft.guide.res.crystalSrc") },
      { name: t("craft.guide.res.steel"), source: t("craft.guide.res.steelSrc") },
      { name: t("craft.guide.res.essence"), source: t("craft.guide.res.essenceSrc") },
      { name: t("craft.guide.res.fragment"), source: t("craft.guide.res.fragmentSrc") },
      { name: t("craft.guide.res.heart"), source: t("craft.guide.res.heartSrc") },
    ],
  };
}
