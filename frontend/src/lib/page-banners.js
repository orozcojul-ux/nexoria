import { useMemo } from "react";
import { useI18n } from "@/contexts/I18nContext";

const BANNER_KEYS = {
  hero: { kicker: "page.hero.kicker", title: "page.hero.title", subtitle: "page.hero.subtitle", pixelTheme: "cyan" },
  shop: { kicker: "page.shop.kicker", title: "page.shop.title", subtitle: "page.shop.subtitle", pixelTheme: "gold" },
  inventory: { kicker: "page.inventory.kicker", title: "page.inventory.title", subtitle: "page.inventory.subtitle", pixelTheme: "gold" },
  craft: { kicker: "page.craft.kicker", title: "page.craft.title", subtitle: "page.craft.subtitle", pixelTheme: "violet" },
  quests: { kicker: "page.quests.kicker", title: "page.quests.title", subtitle: "page.quests.subtitle", pixelTheme: "gold" },
  oracle: { kicker: "page.oracle.kicker", title: "page.oracle.title", subtitle: "page.oracle.subtitle", pixelTheme: "violet" },
  nexusWheel: { kicker: "page.nexusWheel.kicker", title: "page.nexusWheel.title", subtitle: "page.nexusWheel.subtitle", pixelTheme: "violet" },
  guilds: { kicker: "page.guilds.kicker", title: "page.guilds.title", subtitle: "page.guilds.subtitle", pixelTheme: "emerald" },
  forum: { kicker: "page.forum.kicker", title: "page.forum.title", subtitle: "page.forum.subtitle", pixelTheme: "gold" },
  friends: { kicker: "page.friends.kicker", title: "page.friends.title", subtitle: "page.friends.subtitle", pixelTheme: "cyan" },
  tickets: { kicker: "page.tickets.kicker", title: "page.tickets.title", subtitle: "page.tickets.subtitle", pixelTheme: "cyan" },
  nexus: { kicker: "page.nexus.kicker", title: "page.nexus.title", subtitle: "page.nexus.subtitle", pixelTheme: "violet" },
  classes: { kicker: "page.classes.kicker", title: "page.classes.title", subtitle: "page.classes.subtitle", pixelTheme: "violet" },
  events: { kicker: "page.events.kicker", title: "page.events.title", subtitle: "page.events.subtitle", pixelTheme: "gold" },
  kingdom: { kicker: "page.kingdom.kicker", title: "page.kingdom.title", subtitle: "page.kingdom.subtitle", pixelTheme: "emerald" },
  skills: { kicker: "page.skills.kicker", title: "page.skills.title", subtitle: "page.skills.subtitle", pixelTheme: "violet" },
  leaderboards: { kicker: "page.leaderboards.kicker", title: "page.leaderboards.title", subtitle: "page.leaderboards.subtitle", pixelTheme: "gold" },
  community: { kicker: "community.kicker", title: "community.title", subtitle: "community.subtitle", pixelTheme: "violet" },
  legends: { kicker: "page.legends.kicker", title: "page.legends.title", subtitle: "page.legends.subtitle", pixelTheme: "gold" },
  world: { kicker: "page.world.kicker", title: "page.world.title", subtitle: "page.world.subtitle", pixelTheme: "cyan" },
  settings: { kicker: "page.settings.kicker", title: "settings.title", subtitle: "settings.preferences", pixelTheme: "cyan" },
};

/** Build a translated PageShell banner. Pass vars for dynamic subtitles (count, name, aether). */
export function usePageBanner(pageKey, vars = {}) {
  const { t, lang } = useI18n();
  return useMemo(() => {
    const cfg = BANNER_KEYS[pageKey];
    if (!cfg) return { pageKey, title: pageKey, subtitle: "", pixelTheme: "violet" };
    return {
      pageKey,
      kicker: t(cfg.kicker, vars),
      title: t(cfg.title, vars),
      subtitle: t(cfg.subtitle, vars),
      pixelTheme: cfg.pixelTheme,
    };
  }, [pageKey, t, lang, JSON.stringify(vars)]);
}
