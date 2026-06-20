/** Couleurs tchat Nexus Online par rôle / grade. */
export const NEXUS_CHAT_ROLE_COLORS = {
  admin: { name: "#FFD700", text: "#FFF4CC", badge: "rgba(255,215,0,0.18)" },
  moderator: { name: "#FB923C", text: "#FFEDD5", badge: "rgba(249,115,22,0.14)" },
  vip: { name: "#E879F9", text: "#FAE8FF", badge: "rgba(232,121,249,0.12)" },
  beta: { name: "#4ADE80", text: "#DCFCE7", badge: "rgba(74,222,128,0.1)" },
  user: { name: "#A5F3FC", text: "#E8F4FF", badge: "rgba(0,229,255,0.08)" },
};

export function nexusChatColors(role = "user", opts = {}) {
  if (role === "admin") return NEXUS_CHAT_ROLE_COLORS.admin;
  if (role === "moderator") return NEXUS_CHAT_ROLE_COLORS.moderator;
  if (opts.is_vip) return NEXUS_CHAT_ROLE_COLORS.vip;
  if (opts.rank === "Beta Testeur" || opts.active_title === "beta_tester") return NEXUS_CHAT_ROLE_COLORS.beta;
  return NEXUS_CHAT_ROLE_COLORS.user;
}

export const NEXUS_CHAT_EMOJIS = [
  "😀", "😂", "🥲", "😭", "😎", "🤔", "😏", "😡", "🤯", "😴",
  "❤️", "💜", "💙", "💛", "💚", "🧡", "🖤", "💔", "✨", "⭐",
  "🔥", "⚔️", "🛡️", "🏹", "🪄", "💎", "👑", "🎉", "🎊", "🍻",
  "👍", "👎", "👏", "🙏", "💪", "🫡", "✅", "❌", "💀", "👻",
  "🐉", "🦊", "🐺", "🌙", "☀️", "⚡", "🌈", "🎵", "📜", "🗡️",
];
