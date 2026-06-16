/** RPG rank colors — visible on usernames site-wide via HeroName */
export const RANK_STYLES = {
  Novice: {
    color: "#A1A1AA",
    text: "text-zinc-400",
    glow: "",
  },
  Initié: {
    color: "#4ADE80",
    text: "bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-green-400",
    glow: "drop-shadow-[0_0_5px_rgba(74,222,128,0.35)]",
  },
  Rare: {
    color: "#60A5FA",
    text: "bg-clip-text text-transparent bg-gradient-to-r from-sky-300 to-blue-400",
    glow: "drop-shadow-[0_0_5px_rgba(96,165,250,0.4)]",
  },
  Épique: {
    color: "#A78BFA",
    text: "bg-clip-text text-transparent bg-gradient-to-r from-violet-300 to-purple-400",
    glow: "drop-shadow-[0_0_6px_rgba(167,139,250,0.45)]",
  },
  Légendaire: {
    color: "#FB923C",
    text: "bg-clip-text text-transparent bg-gradient-to-r from-orange-300 via-amber-400 to-orange-500",
    glow: "drop-shadow-[0_0_6px_rgba(251,146,60,0.5)]",
  },
  Mythique: {
    color: "#F472B6",
    text: "bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-rose-400 to-fuchsia-400",
    glow: "drop-shadow-[0_0_7px_rgba(244,114,182,0.5)]",
  },
  Divin: {
    color: "#FACC15",
    text: "bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500",
    glow: "drop-shadow-[0_0_8px_rgba(250,204,21,0.55)]",
  },
  Cosmique: {
    color: "#22D3EE",
    text: "bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-sky-300 to-violet-300",
    glow: "drop-shadow-[0_0_8px_rgba(34,211,238,0.55)]",
  },
};

export function getRankStyle(rank) {
  return RANK_STYLES[rank] || RANK_STYLES.Novice;
}

export function rankFromLevel(level) {
  const n = Number(level) || 1;
  if (n >= 900) return "Cosmique";
  if (n >= 700) return "Divin";
  if (n >= 500) return "Mythique";
  if (n >= 300) return "Légendaire";
  if (n >= 150) return "Épique";
  if (n >= 50) return "Rare";
  if (n >= 10) return "Initié";
  return "Novice";
}
