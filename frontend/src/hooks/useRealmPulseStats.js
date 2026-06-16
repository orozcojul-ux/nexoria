import { usePublicStats } from "@/hooks/usePublicStats";

/**
 * Live counters for the « Pulsation du royaume » widget.
 * Polls /stats/public (site-wide presence, visits, events, signups).
 */
export const REALM_PULSE_INTERVAL_MS = 30000;

export function useRealmPulseStats(intervalMs = REALM_PULSE_INTERVAL_MS) {
  const { stats, updatedAt, loading, refresh } = usePublicStats(intervalMs);

  return {
    siteOnline: stats.site_online ?? 0,
    visits: stats.visits_today ?? 0,
    events: stats.events ?? 0,
    signups: stats.new_signups ?? 0,
    updatedAt,
    loading,
    refresh,
    live: !!updatedAt,
  };
}
