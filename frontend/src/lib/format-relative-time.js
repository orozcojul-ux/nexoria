/**
 * Relative time formatting for UI (feed, maintenance, profile, wheel, etc.)
 */

function parseDate(input) {
  if (!input) return null;
  const ms = new Date(input).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** @param {(key: string, vars?: object) => string} t */
export function formatRelativeTime(input, t, fmtDate) {
  const then = parseDate(input);
  if (then === null) return t("time.unknown");

  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return t("time.now");

  if (diffMin < 60) {
    return t("time.minutesAgo", { count: diffMin });
  }

  const hours = Math.floor(diffMin / 60);
  if (hours < 24) {
    return t("time.hoursAgo", { count: hours });
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return t("time.daysAgo", { count: days });
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return t("time.weeksAgo", { count: weeks });
  }

  if (typeof fmtDate === "function") {
    return fmtDate(input);
  }
  try {
    return new Date(then).toLocaleDateString();
  } catch {
    return t("time.unknown");
  }
}

/** Maintenance panel — same engine, legacy key aliases. */
export function formatMaintRelativeTime(iso, t, fmtDate) {
  if (!iso) return t("maintenance.time.just_now");
  const then = parseDate(iso);
  if (then === null) return t("maintenance.time.recently");
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return t("maintenance.time.just_now");
  if (diffMin < 60) return t("maintenance.time.min_ago", { n: diffMin, count: diffMin });
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return t("maintenance.time.hours_ago", { n: hours, count: hours });
  return fmtDate(iso);
}
