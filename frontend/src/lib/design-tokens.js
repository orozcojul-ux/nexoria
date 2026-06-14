/**
 * NEXORIA Design Tokens — Single source of truth for the global premium look.
 *
 * Palette: violet profond, bleu nuit, cyan lumineux, or, noir obsidienne.
 * Style: Dark Fantasy / Futuriste / Cosmique / Mystique.
 * Effects: glow, glassmorphism, gradients, particules.
 */

export const TOKENS = {
  // Base palette
  obsidian: "#05030D",
  abyss: "#0A0613",
  voidPurple: "#1A0B3D",
  midnight: "#0F0820",
  violet: "#9D4CDD",
  violetDeep: "#7928CA",
  cyan: "#00E5FF",
  cyanSoft: "#67E8F9",
  gold: "#FCD34D",
  goldDeep: "#F59E0B",
  amber: "#FBBF24",
  red: "#EF4444",
  emerald: "#10B981",

  // Surfaces
  surface: "rgba(15,8,32,0.85)",
  surfaceGlass: "rgba(15,8,32,0.5)",
  surfaceLight: "rgba(255,255,255,0.05)",
  surfaceBorder: "rgba(255,255,255,0.10)",

  // Glows (box-shadow values)
  glowVioletSoft: "0 0 16px rgba(157,76,221,0.35)",
  glowVioletStrong: "0 0 30px rgba(157,76,221,0.55), inset 0 0 12px rgba(157,76,221,0.25)",
  glowCyan: "0 0 16px rgba(0,229,255,0.4)",
  glowGold: "0 0 16px rgba(252,211,77,0.4)",
  glowRed: "0 0 16px rgba(239,68,68,0.4)",

  // Gradients
  gradientVioletCyan: "linear-gradient(135deg, #7928CA 0%, #00E5FF 100%)",
  gradientCosmic: "linear-gradient(135deg, #1A0B3D 0%, #05030D 50%, #1A0B3D 100%)",
  gradientGold: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #F59E0B 100%)",
};

export const RARITY = {
  common:   { fr: "Commun",     color: "#9CA3AF", glow: "rgba(156,163,175,0.5)",  bg: "from-zinc-700/30 to-zinc-900/30",       border: "border-zinc-500/40",  text: "text-zinc-300" },
  rare:     { fr: "Rare",       color: "#3B82F6", glow: "rgba(59,130,246,0.6)",   bg: "from-blue-700/30 to-blue-900/30",       border: "border-blue-400/60", text: "text-blue-300" },
  epic:     { fr: "Épique",     color: "#A855F7", glow: "rgba(168,85,247,0.7)",   bg: "from-purple-700/30 to-purple-900/30",   border: "border-purple-400/60", text: "text-purple-300" },
  legendary:{ fr: "Légendaire", color: "#F59E0B", glow: "rgba(245,158,11,0.7)",   bg: "from-amber-600/30 to-amber-900/30",     border: "border-amber-400/60", text: "text-amber-300" },
  mythic:   { fr: "Mythique",   color: "#EF4444", glow: "rgba(239,68,68,0.75)",   bg: "from-red-700/30 to-red-900/30",         border: "border-red-400/60",  text: "text-red-300" },
  divine:   { fr: "Divin",      color: "#FBBF24", glow: "rgba(251,191,36,0.85)",  bg: "from-yellow-400/30 to-amber-600/30",    border: "border-yellow-300/80", text: "text-yellow-200" },
  cosmic:   { fr: "Cosmique",   color: "#FFFFFF", glow: "rgba(255,255,255,0.9)",  bg: "from-cyan-300/30 via-purple-400/30 to-cyan-300/30", border: "border-cyan-200",   text: "text-white" },
};

export const SECTION_TONE = {
  cyan:    { color: "#00E5FF", border: "border-cyan-500/40",   bg: "bg-cyan-500/10",   text: "text-cyan-300" },
  violet:  { color: "#9D4CDD", border: "border-purple-500/40", bg: "bg-purple-500/10", text: "text-purple-300" },
  gold:    { color: "#FCD34D", border: "border-yellow-500/40", bg: "bg-yellow-500/10", text: "text-yellow-300" },
  red:     { color: "#EF4444", border: "border-red-500/40",    bg: "bg-red-500/10",    text: "text-red-300" },
  emerald: { color: "#10B981", border: "border-emerald-500/40",bg: "bg-emerald-500/10",text: "text-emerald-300" },
};
