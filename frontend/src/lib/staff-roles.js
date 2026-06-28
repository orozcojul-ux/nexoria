/** Staff role grades — labels and colors for online presence UI */

export function isStaffRole(userOrRole) {
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  return role === "admin" || role === "moderator";
}

/** Sage, Sentinelle ou Gardien Suprême — couleur tchat fixée au grade. */
export function isNexusStaff(userOrRole) {
  if (typeof userOrRole === "string") {
    return userOrRole === "admin" || userOrRole === "moderator";
  }
  if (!userOrRole) return false;
  return (
    userOrRole.role === "admin"
    || userOrRole.role === "moderator"
    || !!userOrRole.is_nexus_supreme
  );
}

export const NEXUS_SUPREME = {
  id: "supreme",
  labelKey: "sidebar.staff_role.supreme",
  label: "Gardien Suprême",
  color: "#FBBF24",
  glow: "rgba(251,191,36,0.5)",
  phaser: 0xfbbf24,
  textLight: "#FEF3C7",
  badge: "rgba(251,191,36,0.18)",
  prefix: "👑 ",
};

export const STAFF_GRADES = [
  { id: "admin", labelKey: "sidebar.staff_role.admin", label: "Sage", color: "#9D4CDD", glow: "rgba(157,76,221,0.45)", phaser: 0x9d4cdd, textLight: "#EDE9FE", badge: "rgba(157,76,221,0.18)", prefix: "✨ " },
  { id: "moderator", labelKey: "sidebar.staff_role.mod", label: "Sentinelle", color: "#F97316", glow: "rgba(249,115,22,0.4)", phaser: 0xf97316, textLight: "#FFEDD5", badge: "rgba(249,115,22,0.14)", prefix: "🛡️ " },
];

function hexToRgba(hex, alpha = 0.14) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lightenHex(hex, amount = 0.35) {
  const h = hex.replace("#", "");
  const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) + 255 * amount));
  const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) + 255 * amount));
  const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) + 255 * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Couleurs tchat (name / text / badge) pour un membre staff ou Gardien Suprême. */
export function getStaffChatColors(userOrPlayer) {
  const visuals = getStaffVisuals(userOrPlayer);
  if (!visuals) return null;
  return {
    name: visuals.color,
    text: visuals.textLight || lightenHex(visuals.color, 0.42),
    badge: visuals.badge || hexToRgba(visuals.color, 0.14),
  };
}

/** Visuels staff pour nametags, bulles et HeroName. */
export function getStaffVisuals(userOrPlayer) {
  if (!userOrPlayer) return null;
  if (userOrPlayer.is_nexus_supreme) {
    return { ...NEXUS_SUPREME, role: "admin" };
  }
  const role = userOrPlayer.role;
  const grade = STAFF_GRADES.find((g) => g.id === role);
  if (!grade) return null;
  return { ...grade, role };
}

/** Carte héros — « Oui (Sage) » / « Non » */
export function formatStaffMembership(user, t = null) {
  const visuals = getStaffVisuals(user);
  if (!visuals) return "Non";
  const label = t && visuals.labelKey ? t(visuals.labelKey) : visuals.label;
  return `Oui (${label})`;
}

export function groupStaffByGrade(members = [], t = null) {
  const groups = Object.fromEntries(STAFF_GRADES.map((g) => [g.id, []]));
  for (const m of members) {
    if (groups[m.role]) groups[m.role].push(m);
  }
  return STAFF_GRADES.map((grade) => ({
    ...grade,
    label: t && grade.labelKey ? t(grade.labelKey) : grade.label,
    members: groups[grade.id] || [],
    count: (groups[grade.id] || []).length,
  }));
}

/** Groupe les héros Nexus Online : Gardien Suprême → Sages → Sentinelles → Héros. */
export function groupOnlineHeroes(members = [], t = null) {
  const supreme = [];
  const byRole = { admin: [], moderator: [], heroes: [] };

  for (const m of members) {
    if (m.is_nexus_supreme) supreme.push(m);
    else if (m.role === "admin") byRole.admin.push(m);
    else if (m.role === "moderator") byRole.moderator.push(m);
    else byRole.heroes.push(m);
  }

  const groups = [];
  if (supreme.length) {
    groups.push({
      id: "supreme",
      label: t && NEXUS_SUPREME.labelKey ? t(NEXUS_SUPREME.labelKey) : NEXUS_SUPREME.label,
      color: NEXUS_SUPREME.color,
      glow: NEXUS_SUPREME.glow,
      members: supreme,
      count: supreme.length,
    });
  }
  for (const grade of STAFF_GRADES) {
    const list = byRole[grade.id] || [];
    if (!list.length) continue;
    groups.push({
      ...grade,
      label: t && grade.labelKey ? t(grade.labelKey) : grade.label,
      members: list,
      count: list.length,
    });
  }
  if (byRole.heroes.length) {
    groups.push({
      id: "heroes",
      label: t ? t("staff.group.realm_heroes") : "Héros du Royaume",
      color: "#38E8FF",
      glow: "rgba(56,232,255,0.35)",
      members: byRole.heroes,
      count: byRole.heroes.length,
    });
  }
  return { total: members.length, groups };
}

export const EMPTY_ONLINE_HEROES = { total: 0, members: [] };

export const EMPTY_STAFF_ONLINE = {
  total: 0,
  by_role: { admin: 0, moderator: 0 },
  members: [],
};
