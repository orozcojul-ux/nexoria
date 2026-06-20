import { isStaffRole } from "@/lib/staff-roles";

/** Contenu du panneau d'aide tchat Nexus Online. */

export function getNexusChatHelpSections({ role = "user", isVip = false } = {}) {
  const isStaff = isStaffRole(role);
  const sections = [
    {
      id: "general",
      title: "Commandes générales",
      icon: "📜",
      commands: [
        { cmd: "/help", desc: "Ouvre ce grimoire des commandes." },
      ],
    },
  ];

  if (isVip) {
    sections.push({
      id: "vip",
      title: "Pass Ascendant · VIP",
      icon: "👑",
      commands: [
        { cmd: "/color rose", desc: "Couleur rose (10 teintes disponibles)." },
        { cmd: "/color violet", desc: "Teintes : rose, violet, vert, bleu, or, orange, rouge, magenta, cyan, lila." },
        { cmd: "/color #f472b6", desc: "Couleur hex autorisée (palette VIP)." },
        { cmd: "/color reset", desc: "Revenir à la couleur VIP par défaut." },
      ],
    });
  } else {
    sections.push({
      id: "vip-locked",
      title: "Pass Ascendant · VIP",
      icon: "🔒",
      muted: true,
      commands: [
        { cmd: "/color", desc: "Personnalise la couleur de ton pseudo et de tes messages (VIP uniquement)." },
      ],
    });
  }

  if (isStaff) {
    sections.push({
      id: "staff-mod",
      title: "Gardien · Modération",
      icon: "🛡️",
      commands: [
        { cmd: "/kick <pseudo> [raison]", desc: "Expulse un joueur de la salle." },
        { cmd: "/kickall [raison]", desc: "Expulse tous les joueurs (sauf gardiens)." },
        { cmd: "/mute <pseudo> <min>", desc: "Réduit un joueur au silence." },
        { cmd: "/muteall <min>", desc: "Silence toute la salle (sauf gardiens)." },
        { cmd: "/unmute <pseudo>", desc: "Autorise à nouveau un joueur à parler." },
        { cmd: "/unmuteall", desc: "Lève le silence sur toute la salle." },
        { cmd: "/clearchat", desc: "Nettoie l'historique du tchat de la salle." },
      ],
    });
  }

  return sections;
}
