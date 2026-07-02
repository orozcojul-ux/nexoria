/** Libellés français pour la file de modération (admin). */

export const MOD_STATUS = {
  pending_review: {
    label: "À valider",
    hint: "Naria/Shumi a pris une mesure — vous pouvez confirmer, annuler ou restaurer le message.",
    tone: "amber",
  },
  applied: {
    label: "Mesure active",
    hint: "L'action est en vigueur (masquage, avertissement, restriction…).",
    tone: "violet",
  },
  blocked: {
    label: "Bloqué à l'envoi",
    hint: "Le message n'a jamais été publié sur le site.",
    tone: "red",
  },
  logged: {
    label: "Surveillance seule",
    hint: "Signal faible enregistré — aucune sanction appliquée au joueur.",
    tone: "zinc",
  },
  approved: {
    label: "Confirmé",
    hint: "L'équipe a validé la décision de la sentinelle.",
    tone: "emerald",
  },
  dismissed: {
    label: "Infondé",
    hint: "L'équipe a annulé l'alerte — la mesure était excessive.",
    tone: "zinc",
  },
  restored: {
    label: "Restauré",
    hint: "Le contenu a été remis visible pour les joueurs.",
    tone: "cyan",
  },
};

export const MOD_ACTION = {
  hide: "Message masqué aux autres joueurs",
  warning: "Avertissement envoyé au joueur",
  block: "Publication refusée (non publié)",
  restrict: "Compte temporairement restreint",
  ban: "Ban appliqué par la sentinelle",
  ban_proposed: "Ban proposé — décision du Gardien Suprême requise",
  log: "Signal enregistré sans action",
};

export const MOD_REASON = {
  insult: "Insulte ou vulgarité",
  threat: "Menace",
  hate: "Propos haineux / slur grave",
  spam: "Spam ou répétition",
  repeated_message: "Message répété",
  caps_abuse: "Abus de majuscules",
  suspicious_link: "Lien suspect",
  external_discord: "Lien Discord non autorisé",
  other: "Autre règle",
  none: "—",
};

export const MOD_CONTENT = {
  news_comment: "Commentaire actualité",
  feed_post: "Publication fil d'activité",
  feed_comment: "Commentaire fil",
  forum_thread: "Sujet forum",
  forum_reply: "Réponse forum",
  forum: "Forum",
  guild: "Guilde",
  guild_chat: "Chat guilde",
  profile: "Profil joueur",
  nexus_chat: "Tchat Nexus",
  friend_message: "Message privé",
};

export const MOD_SEVERITY = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
  critical: "Critique",
};

export const MOD_FILTER = {
  all: "Tous les événements",
  pending_review: "À valider par le Gardien Suprême",
  applied: "Mesures actuellement en vigueur",
  logged: "Surveillance seule (faible confiance)",
  approved: "Confirmés par l'équipe",
  dismissed: "Alertes annulées",
  blocked: "Messages bloqués à l'envoi",
};

const TONE_CLASS = {
  amber: "bg-amber-500/15 text-amber-200 border-amber-500/35",
  violet: "bg-violet-500/15 text-violet-200 border-violet-500/35",
  red: "bg-red-500/15 text-red-200 border-red-500/35",
  zinc: "bg-zinc-500/10 text-zinc-300 border-zinc-500/25",
  emerald: "bg-emerald-500/15 text-emerald-200 border-emerald-500/35",
  cyan: "bg-cyan-500/15 text-cyan-200 border-cyan-500/35",
};

export function modStatusMeta(status) {
  return MOD_STATUS[status] || {
    label: status || "Inconnu",
    hint: "",
    tone: "zinc",
  };
}

export function modStatusClass(status) {
  return TONE_CLASS[modStatusMeta(status).tone] || TONE_CLASS.zinc;
}

export function modActionLabel(actionType, action) {
  return MOD_ACTION[actionType] || MOD_ACTION[action] || actionType || action || "Action";
}

export function modReasonLabel(code, fallback) {
  if (!code) return fallback || "—";
  return MOD_REASON[code] || String(code).replace(/_/g, " ");
}

export function modContentLabel(type) {
  return MOD_CONTENT[type] || type?.replace(/_/g, " ") || "Contenu";
}

export function modSeverityLabel(severity) {
  return MOD_SEVERITY[severity] || severity || "";
}

export function formatModDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

export function modUserMessage(t, key) {
  if (!key) return null;
  const msg = t(key);
  return msg && msg !== key ? msg : null;
}
