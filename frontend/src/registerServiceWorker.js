/** Register the PWA service worker (production only). */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL || ""}/service-worker.js`)
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[PWA] Service worker registration failed:", err);
        }
      });
  });
}
