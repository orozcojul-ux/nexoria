import { useEffect, useRef, useState, useCallback } from "react";
import api from "@/lib/api";

const DEFAULT_STATS = {
  heroes_online: 0,
  site_online: 0,
  staff_online: { total: 0, by_role: { admin: 0, moderator: 0 }, members: [] },
  visits_today: 0,
  events: 0,
  new_signups: 0,
};

/**
 * Poll /stats/public on an interval. Pauses when the document tab is hidden.
 */
export function usePublicStats(intervalMs = 30000) {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const visibleRef = useRef(typeof document !== "undefined" ? !document.hidden : true);

  const load = useCallback(() => {
    if (!visibleRef.current) return;
    return api.get("/stats/public")
      .then((r) => {
        setStats((prev) => ({ ...prev, ...(r.data || {}) }));
        setUpdatedAt(Date.now());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const onVisibility = () => {
      visibleRef.current = !document.hidden;
      if (visibleRef.current) load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const id = setInterval(load, intervalMs);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load, intervalMs]);

  return { stats, updatedAt, loading, refresh: load };
}
