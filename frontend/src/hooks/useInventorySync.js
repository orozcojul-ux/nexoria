import { useEffect } from "react";

/** DOM event dispatched by NexusSocketContext on `inventory:updated` WS messages. */
export const INVENTORY_UPDATED_EVENT = "nexoria:inventory:updated";

/**
 * Subscribe to real-time inventory changes (shop, chest, pickup, GM grant).
 * @param {function(object): void} onUpdate
 */
export function useInventorySync(onUpdate) {
  useEffect(() => {
    if (!onUpdate) return undefined;
    const handler = (e) => onUpdate(e.detail || {});
    window.addEventListener(INVENTORY_UPDATED_EVENT, handler);
    return () => window.removeEventListener(INVENTORY_UPDATED_EVENT, handler);
  }, [onUpdate]);
}
