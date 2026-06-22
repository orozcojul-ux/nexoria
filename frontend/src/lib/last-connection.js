/**
 * Formate la date et l'heure de dernière connexion d'un héros.
 */
export function formatLastConnection(lastSeen, { locale = "fr-FR", unknown = "Dernière connexion inconnue", prefix = "Dernière connexion" } = {}) {
  if (!lastSeen) return unknown;

  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return unknown;

  const formatted = date.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return prefix ? `${prefix} · ${formatted}` : formatted;
}
