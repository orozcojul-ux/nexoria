/**
 * NEXORIA PWA service worker — light static cache only.
 * Never caches API, auth, uploads, or user-specific data.
 */
const CACHE_NAME = "nexoria-static-v2";

/** Paths that may be cached (same-origin static assets only). */
function isCacheableStatic(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  if (p.startsWith("/api")) return false;
  if (p.startsWith("/socket.io")) return false;
  if (p.includes("/auth/")) return false;
  if (p.includes("/upload")) return false;
  if (p.startsWith("/static/")) return true;
  if (p.startsWith("/icons/")) return true;
  if (p === "/manifest.json" || p === "/favicon-32.png" || p === "/favicon-16.png" || p === "/logo-nexoria.png") return true;
  if (/\.(js|css|woff2?|png|svg|ico|webp|json|map)$/i.test(p)) return true;
  return false;
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("nexoria-") && k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isCacheableStatic(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        network.catch(() => {});
        return cached;
      }

      const fresh = await network;
      if (fresh) return fresh;
      return Response.error();
    })(),
  );
});
