/** Staff role grades — labels and colors for online presence UI */

export function isStaffRole(userOrRole) {
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  return role === "admin" || role === "moderator";
}

export const STAFF_GRADES = [
  { id: "admin", labelKey: "sidebar.staff_role.admin", label: "Sage", color: "#9D4CDD", glow: "rgba(157,76,221,0.45)" },
  { id: "moderator", labelKey: "sidebar.staff_role.mod", label: "Modérateur", color: "#F97316", glow: "rgba(249,115,22,0.4)" },
];

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
