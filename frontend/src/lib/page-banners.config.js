/**

 * Registre des bannières de page.

 * `position` = point de focus CSS object-position (texte généralement en haut-centre).

 */

export const PAGE_BANNERS = {

  classes:      { theme: "violet",  image: "/assets/banners/classes.webp",      position: "50% 22%" },

  guilds:       { theme: "gold",    image: "/assets/banners/guilds.webp",       position: "50% 28%" },

  leaderboards: { theme: "cyan",    image: "/assets/banners/leaderboards.webp", position: "50% 30%" },

  events:       { theme: "emerald", image: "/assets/banners/events.webp",       position: "50% 6%" },

  oracle:       { theme: "cyan",    image: "/assets/banners/oracle.webp",       position: "50% 30%" },

  forum:        { theme: "gold",    image: "/assets/banners/forum.webp",        position: "50% 6%" },

  tickets:      { theme: "cyan",    image: "/assets/banners/tickets.webp",      position: "50% 18%" },

  friends:      { theme: "emerald", image: "/assets/banners/friends.webp",      position: "50% 20%" },

  hero:         { theme: "violet",  image: null },

  inventory:    { theme: "gold",    image: "/assets/banners/inventory.webp",     position: "50% 6%" },

  quests:       { theme: "gold",    image: "/assets/banners/quests.webp",       position: "50% 35%" },

  shop:         { theme: "gold",    image: "/assets/banners/shop.webp",         position: "50% 18%" },

  settings:     { theme: "cyan",    image: "/assets/banners/settings.webp",     position: "50% 25%" },

  admin:        { theme: "gold",    image: "/assets/banners/admin.webp",        position: "50% 6%" },

  nexus:        { theme: "violet",  image: null },

  skills:       { theme: "cyan",    image: null },

  kingdom:      { theme: "emerald", image: null },

  world:        { theme: "violet",  image: "/assets/banners/world.webp",        position: "50% 28%" },

  legends:      { theme: "gold",    image: "/assets/banners/leaderboards.webp", position: "50% 30%" },

};



export function getPageBannerConfig(pageKey) {

  return PAGE_BANNERS[pageKey] || { theme: "violet", image: null, position: "50% 20%" };

}



export function getPageBannerImage(pageKey) {

  return getPageBannerConfig(pageKey).image || null;

}



export function setPageBannerImage(pageKey, imageUrl) {

  if (!PAGE_BANNERS[pageKey]) PAGE_BANNERS[pageKey] = { theme: "violet", image: null, position: "50% 20%" };

  PAGE_BANNERS[pageKey].image = imageUrl;

}


