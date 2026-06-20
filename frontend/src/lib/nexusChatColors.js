import { getStaffChatColors } from "@/lib/staff-roles";

/** Couleurs tchat Nexus Online par rôle / grade / VIP personnalisé. */

export const NEXUS_CHAT_ROLE_COLORS = {
  admin: { name: "#9D4CDD", text: "#EDE9FE", badge: "rgba(157,76,221,0.18)" },
  moderator: { name: "#F97316", text: "#FFEDD5", badge: "rgba(249,115,22,0.14)" },
  supreme: { name: "#FBBF24", text: "#FEF3C7", badge: "rgba(251,191,36,0.18)" },
  vip: { name: "#E879F9", text: "#FAE8FF", badge: "rgba(232,121,249,0.12)" },
  beta: { name: "#4ADE80", text: "#DCFCE7", badge: "rgba(74,222,128,0.1)" },
  user: { name: "#A5F3FC", text: "#E8F4FF", badge: "rgba(0,229,255,0.08)" },
};

/** Palette VIP — synchronisée avec backend/nexus_chat_commands.py */
export const NEXUS_VIP_COLOR_PRESETS = [
  { id: "rose", hex: "#f472b6", label: "Rose" },
  { id: "violet", hex: "#a78bfa", label: "Violet" },
  { id: "vert", hex: "#34d399", label: "Vert" },
  { id: "bleu", hex: "#60a5fa", label: "Bleu" },
  { id: "or", hex: "#fbbf24", label: "Or" },
  { id: "orange", hex: "#fb923c", label: "Orange" },
  { id: "rouge", hex: "#f87171", label: "Rouge" },
  { id: "magenta", hex: "#e879f9", label: "Magenta" },
  { id: "cyan", hex: "#2dd4bf", label: "Cyan" },
  { id: "lila", hex: "#c084fc", label: "Lila" },
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

export function colorsFromChatHex(hex) {
  if (!hex) return null;
  const name = hex.toLowerCase();
  return {
    name,
    text: lightenHex(name, 0.42),
    badge: hexToRgba(name, 0.14),
  };
}

export function nexusChatColors(role = "user", opts = {}) {
  const staffColors = getStaffChatColors({ role, is_nexus_supreme: opts.is_nexus_supreme });
  if (staffColors) return staffColors;

  const customHex = opts.chat_color || opts.nexus_chat_color;
  if (customHex) {
    return colorsFromChatHex(customHex) || NEXUS_CHAT_ROLE_COLORS.vip;
  }

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

export const NEXUS_CHAT_COMMANDS_HINT = "/help · VIP: /color";
