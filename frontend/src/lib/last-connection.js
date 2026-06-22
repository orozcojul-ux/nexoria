/**
 * Formate la date et l'heure exactes de dernière activité sur le site.
 */
export function formatLastSeenDateTime(lastSeen, { locale = "fr-FR", unknown = "—" } = {}) {
  if (!lastSeen) return unknown;

  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return unknown;

  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formate la dernière connexion d'un héros (texte relatif ou date complète).
 */
export function formatLastConnection(lastSeen, { locale = "fr-FR", unknown = "Dernière connexion inconnue", prefix = "Dernière connexion" } = {}) {
  if (!lastSeen) return unknown;

  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return unknown;

  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0) return `${prefix} · à l'instant`;

  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return `${prefix} · à l'instant`;
  if (diffMins < 60) return `${prefix} · il y a ${diffMins} min`;
  if (diffHours < 24) return `${prefix} · il y a ${diffHours} h`;
  if (diffDays < 7) return `${prefix} · il y a ${diffDays} j`;

  const formatted = date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${prefix} · ${formatted}`;
}
