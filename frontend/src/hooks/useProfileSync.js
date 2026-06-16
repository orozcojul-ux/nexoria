import { useEffect } from "react";

export const PROFILE_UPDATED_EVENT = "nexoria:profile:updated";

/** Subscribe to real-time profile/cosmetic changes (shop, equip, title). */
export function useProfileSync(onUpdate) {
  useEffect(() => {
    if (!onUpdate) return undefined;
    const handler = (e) => onUpdate(e.detail || {});
    window.addEventListener(PROFILE_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handler);
  }, [onUpdate]);
}
