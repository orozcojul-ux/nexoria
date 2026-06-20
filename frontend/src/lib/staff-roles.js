/** Staff role grades — labels and colors for online presence UI */

export function isStaffRole(userOrRole) {
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  return role === "admin" || role === "moderator";
}

export const NEXUS_SUPREME = {
  id: "supreme",
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

export const EMPTY_STAFF_ONLINE = {
  total: 0,
  by_role: { admin: 0, moderator: 0 },
  members: [],
};
